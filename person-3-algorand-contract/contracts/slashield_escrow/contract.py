"""
SLAShield402 Escrow Smart Contract.
Built with PyTeal for Algorand Testnet.

State Lifecycle Transitions:
  UNINITIALIZED -> LOCKED (create_payment)
  LOCKED -> APPROVED -> SETTLED (approve_and_settle: releases USDC/ALGO to provider)
  LOCKED -> SLA_FAILED -> REFUNDED_AND_PENALIZED (fail_and_refund: refunds agent & slashes provider bond)

Guardrails:
  1. Only authorized backend address (KEY_AUTHORIZED_BACKEND) can call settlement/refund methods.
  2. Reject calls if payment_id does not match active escrow.
  3. Reject double settlement or refund on already finalized escrows.
"""
from pyteal import (
    App,
    Assert,
    Bytes,
    Btoi,
    Concat,
    Cond,
    Expr,
    Global,
    If,
    InnerTxnBuilder,
    Int,
    Mode,
    OnComplete,
    Return,
    Seq,
    Subroutine,
    TealType,
    Txn,
    TxnField,
    TxnType,
    And,
    Or,
    Eq,
    Neq,
    compileTeal,
)
import os

from contracts.slashield_escrow.state import (
    EscrowState,
    KEY_AGENT_ADDRESS,
    KEY_PROVIDER_ADDRESS,
    KEY_PAYMENT_AMOUNT,
    KEY_PROVIDER_BOND_AMOUNT,
    KEY_CURRENT_STATE,
    KEY_PAYMENT_ID,
    KEY_AUTHORIZED_BACKEND,
    KEY_USDC_ASA_ID,
    BOND_PREFIX,
)
from contracts.slashield_escrow.bond import get_bond_state_key, DEFAULT_SLASH_PERCENTAGE


def approval_program() -> Expr:
    """
    Main Approval Program for SLAShield402 Escrow Contract.
    """
    
    # State key for bond lookup: Concat("bond_", provider_address)
    provider_bond_key = get_bond_state_key(Txn.application_args[1]) if Txn.application_args.length() > Int(1) else Bytes("")

    # --- 1. Initialization (On Application Creation) ---
    on_create = Seq(
        # Set authorized backend address to contract creator by default
        App.globalPut(KEY_AUTHORIZED_BACKEND, Txn.sender()),
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.UNINITIALIZED.value)),
        App.globalPut(KEY_USDC_ASA_ID, Int(0)),
        Return(Int(1)),
    )

    # --- 2. Register Provider Bond ---
    # Application Args: ["register_provider_bond", provider_address, bond_amount]
    bond_amount_arg = Btoi(Txn.application_args[2]) if Txn.application_args.length() > Int(2) else Int(0)
    current_provider_bond = App.globalGet(provider_bond_key)
    
    register_provider_bond = Seq(
        Assert(Txn.application_args.length() >= Int(3)),
        # Guardrail: Sender must be authorized backend or self-registering provider
        Assert(
            Or(
                Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND),
                Txn.sender() == Txn.application_args[1]
            )
        ),
        # Update provider bond balance in global state
        App.globalPut(provider_bond_key, current_provider_bond + bond_amount_arg),
        Return(Int(1)),
    )

    # --- 3. Create Escrow Payment ---
    # Application Args: ["create_payment", agent_address, provider_address, payment_id, amount, usdc_asa_id]
    arg_agent = Txn.application_args[1]
    arg_provider = Txn.application_args[2]
    arg_payment_id = Txn.application_args[3]
    arg_amount = Btoi(Txn.application_args[4])
    arg_asa_id = Btoi(Txn.application_args[5]) if Txn.application_args.length() > Int(5) else Int(0)

    create_payment = Seq(
        Assert(Txn.application_args.length() >= Int(5)),
        # Guardrail 1: Sender must be authorized backend
        Assert(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND)),
        # Guardrail 2: Reject if contract already locked/settled/refunded
        Assert(
            Or(
                App.globalGet(KEY_CURRENT_STATE) == Bytes(EscrowState.UNINITIALIZED.value),
                App.globalGet(KEY_CURRENT_STATE) == Bytes(EscrowState.SETTLED.value),
                App.globalGet(KEY_CURRENT_STATE) == Bytes(EscrowState.REFUNDED_AND_PENALIZED.value),
            )
        ),
        # Guardrail 3: Amount must be greater than zero
        Assert(arg_amount > Int(0)),

        # State Transition: UNINITIALIZED -> LOCKED
        App.globalPut(KEY_AGENT_ADDRESS, arg_agent),
        App.globalPut(KEY_PROVIDER_ADDRESS, arg_provider),
        App.globalPut(KEY_PAYMENT_ID, arg_payment_id),
        App.globalPut(KEY_PAYMENT_AMOUNT, arg_amount),
        App.globalPut(KEY_USDC_ASA_ID, arg_asa_id),
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.LOCKED.value)),
        Return(Int(1)),
    )

    # --- 4. Approve and Settle Payment ---
    # Application Args: ["approve_and_settle", payment_id]
    passed_payment_id = Txn.application_args[1]
    payment_asa_id = App.globalGet(KEY_USDC_ASA_ID)
    payment_amt = App.globalGet(KEY_PAYMENT_AMOUNT)
    provider_addr = App.globalGet(KEY_PROVIDER_ADDRESS)

    approve_and_settle = Seq(
        Assert(Txn.application_args.length() >= Int(2)),
        # Guardrail 1: Sender must be authorized backend
        Assert(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND)),
        # Guardrail 2: State MUST be LOCKED (rejects double settlement or refunding settled payments)
        Assert(App.globalGet(KEY_CURRENT_STATE) == Bytes(EscrowState.LOCKED.value)),
        # Guardrail 3: payment_id must match active escrow payment_id
        Assert(passed_payment_id == App.globalGet(KEY_PAYMENT_ID)),

        # State Transition: LOCKED -> APPROVED -> SETTLED
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.APPROVED.value)),

        # Transfer funds to provider via Inner Transaction
        If(payment_asa_id > Int(0))
        .Then(
            # USDC ASA Transfer
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.AssetTransfer,
                        TxnField.xfer_asset: payment_asa_id,
                        TxnField.asset_amount: payment_amt,
                        TxnField.asset_receiver: provider_addr,
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        )
        .Else(
            # ALGO Transfer
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.Payment,
                        TxnField.amount: payment_amt,
                        TxnField.receiver: provider_addr,
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        ),

        # Final State Update: APPROVED -> SETTLED
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.SETTLED.value)),
        Return(Int(1)),
    )

    # --- 5. Fail and Refund Payment (with Provider Bond Slash) ---
    # Application Args: ["fail_and_refund", payment_id]
    agent_addr = App.globalGet(KEY_AGENT_ADDRESS)
    provider_bond_state_key = Concat(Bytes(BOND_PREFIX), provider_addr)
    staked_bond = App.globalGet(provider_bond_state_key)
    # Calculate 10% penalty slash on provider bond balance
    slash_penalty = (staked_bond * Int(DEFAULT_SLASH_PERCENTAGE)) / Int(100)

    fail_and_refund = Seq(
        Assert(Txn.application_args.length() >= Int(2)),
        # Guardrail 1: Sender must be authorized backend
        Assert(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND)),
        # Guardrail 2: State MUST be LOCKED (rejects double refund or refunding settled payments)
        Assert(App.globalGet(KEY_CURRENT_STATE) == Bytes(EscrowState.LOCKED.value)),
        # Guardrail 3: payment_id must match active escrow payment_id
        Assert(passed_payment_id == App.globalGet(KEY_PAYMENT_ID)),

        # State Transition: LOCKED -> SLA_FAILED
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.SLA_FAILED.value)),

        # Refund escrow funds to agent via Inner Transaction
        If(payment_asa_id > Int(0))
        .Then(
            # USDC ASA Refund
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.AssetTransfer,
                        TxnField.xfer_asset: payment_asa_id,
                        TxnField.asset_amount: payment_amt,
                        TxnField.asset_receiver: agent_addr,
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        )
        .Else(
            # ALGO Refund
            Seq(
                InnerTxnBuilder.Begin(),
                InnerTxnBuilder.SetFields(
                    {
                        TxnField.type_enum: TxnType.Payment,
                        TxnField.amount: payment_amt,
                        TxnField.receiver: agent_addr,
                    }
                ),
                InnerTxnBuilder.Submit(),
            )
        ),

        # Slash Provider Bond in Global State
        If(staked_bond > slash_penalty)
        .Then(App.globalPut(provider_bond_state_key, staked_bond - slash_penalty))
        .Else(App.globalPut(provider_bond_state_key, Int(0))),

        # Final State Update: SLA_FAILED -> REFUNDED_AND_PENALIZED
        App.globalPut(KEY_CURRENT_STATE, Bytes(EscrowState.REFUNDED_AND_PENALIZED.value)),
        Return(Int(1)),
    )

    # --- 6. Opt In Application Account to ASA ---
    # Application Args: ["opt_in_asset", asa_id]
    opt_in_asa_id = Btoi(Txn.application_args[1]) if Txn.application_args.length() > Int(1) else Int(0)
    opt_in_asset = Seq(
        Assert(Txn.application_args.length() >= Int(2)),
        Assert(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND)),
        Assert(opt_in_asa_id > Int(0)),
        InnerTxnBuilder.Begin(),
        InnerTxnBuilder.SetFields(
            {
                TxnField.type_enum: TxnType.AssetTransfer,
                TxnField.xfer_asset: opt_in_asa_id,
                TxnField.asset_amount: Int(0),
                TxnField.asset_receiver: Global.current_application_address(),
            }
        ),
        InnerTxnBuilder.Submit(),
        Return(Int(1)),
    )

    # Route based on Application Call ApplicationArgs[0]
    method_select = Txn.application_args[0]
    return Cond(
        [Txn.application_id() == Int(0), on_create],
        [Txn.on_completion() == OnComplete.DeleteApplication, Return(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND))],
        [Txn.on_completion() == OnComplete.UpdateApplication, Return(Txn.sender() == App.globalGet(KEY_AUTHORIZED_BACKEND))],
        [Txn.on_completion() == OnComplete.OptIn, Return(Int(1))],
        [Txn.on_completion() == OnComplete.CloseOut, Return(Int(1))],
        [method_select == Bytes("register_provider_bond"), register_provider_bond],
        [method_select == Bytes("create_payment"), create_payment],
        [method_select == Bytes("approve_and_settle"), approve_and_settle],
        [method_select == Bytes("fail_and_refund"), fail_and_refund],
        [method_select == Bytes("opt_in_asset"), opt_in_asset],
    )


def clear_program() -> Expr:
    """Clear state program, always approves."""
    return Return(Int(1))


def compile_contract(output_dir: str = "contracts/slashield_escrow/artifacts") -> tuple[str, str]:
    """
    Compiles PyTeal approval and clear programs to TEAL string source code,
    and saves artifacts to disk.
    """
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_program(), Mode.Application, version=8)

    os.makedirs(output_dir, exist_ok=True)
    with open(os.path.join(output_dir, "approval.teal"), "w") as f:
        f.write(approval_teal)
    with open(os.path.join(output_dir, "clear.teal"), "w") as f:
        f.write(clear_teal)

    return approval_teal, clear_teal


if __name__ == "__main__":
    app_teal, clr_teal = compile_contract()
    print("SLAShield402 Escrow Smart Contract PyTeal Compiled Successfully!")
    print(f"Approval Program TEAL size: {len(app_teal)} bytes")
    print(f"Clear Program TEAL size: {len(clr_teal)} bytes")
