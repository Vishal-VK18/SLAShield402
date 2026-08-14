"""
Standalone script to trigger contract settlement when Person 2's SLA Validator returns PASS.
Submits an approve_and_settle Application Call transaction on Algorand Testnet.

Usage:
  python scripts/settle.py --payment_id REQ-2026-0814-001 --amount 20000
"""
import argparse
import sys
import os

# Ensure package root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction, encoding
from contracts.slashield_escrow.state import EscrowState
from deployment.deploy_config import (
    ALGOD_SERVER,
    ALGOD_PORT,
    ALGOD_TOKEN,
    DEPLOYER_MNEMONIC,
    AUTHORIZED_BACKEND_ADDRESS,
    USDC_ASA_ID,
)

DEFAULT_APP_ID = 769236555
DEFAULT_PAYMENT_ID = "REQ-2026-0814-001"
DEFAULT_AGENT_ADDR = AUTHORIZED_BACKEND_ADDRESS or "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"
DEFAULT_PROVIDER_ADDR = AUTHORIZED_BACKEND_ADDRESS or "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"
DEFAULT_PAYMENT_AMOUNT = 20_000  # 0.02 USDC


def settle_payment(
    payment_id: str = DEFAULT_PAYMENT_ID,
    agent_address: str = DEFAULT_AGENT_ADDR,
    provider_address: str = DEFAULT_PROVIDER_ADDR,
    amount: int = DEFAULT_PAYMENT_AMOUNT,
    app_id: int = DEFAULT_APP_ID,
    caller: str = AUTHORIZED_BACKEND_ADDRESS,
) -> dict:
    """
    Executes approve_and_settle on the SLAShield402 smart contract on Algorand Testnet.
    """
    print("==================================================")
    print("     SLAShield402 Settlement Execution (PASS)     ")
    print("==================================================")
    print(f" Target Contract App ID: {app_id}")
    print(f" Payment ID:             {payment_id}")
    print(f" Agent Address:          {agent_address}")
    print(f" Provider Address:       {provider_address}")
    print(f" Settlement Amount:      {amount} micro-units ({amount / 1_000_000:.4f} USDC)")
    print("--------------------------------------------------")

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"User-Agent": "SLAShield402-Script"})
    
    # Load signing account
    try:
        private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
        sender_address = account.address_from_private_key(private_key)
    except Exception:
        private_key, sender_address = account.generate_account()

    effective_caller = caller or sender_address
    if AUTHORIZED_BACKEND_ADDRESS and effective_caller != AUTHORIZED_BACKEND_ADDRESS:
        raise PermissionError(f"Reject: Caller '{effective_caller}' is unauthorized. Only AUTHORIZED_BACKEND_ADDRESS can settle.")

    params = client.suggested_params()

    # Decode 58-char Algorand addresses to 32 raw bytes for TEAL
    raw_agent_bytes = encoding.decode_address(agent_address)
    raw_provider_bytes = encoding.decode_address(provider_address)

    # 1. Create/lock payment on contract
    create_args = [
        b"create_payment",
        raw_agent_bytes,
        raw_provider_bytes,
        payment_id.encode("utf-8"),
        amount.to_bytes(8, "big"),
        (0).to_bytes(8, "big"),
    ]

    try:
        create_txn = transaction.ApplicationNoOpTxn(
            sender=sender_address,
            sp=params,
            index=app_id,
            app_args=create_args,
        )
        signed_create = create_txn.sign(private_key)
        tx_create_id = client.send_transaction(signed_create)
        transaction.wait_for_confirmation(client, tx_create_id, 4)
        print(f"[1/2] Escrow Payment Locked On-Chain (Tx ID: {tx_create_id})")
    except Exception as e:
        print(f"[1/2] Payment creation trace: {e}")

    # 2. Execute approve_and_settle
    settle_args = [
        b"approve_and_settle",
        payment_id.encode("utf-8"),
    ]

    params = client.suggested_params()
    settle_txn = transaction.ApplicationNoOpTxn(
        sender=sender_address,
        sp=params,
        index=app_id,
        app_args=settle_args,
    )
    signed_settle = settle_txn.sign(private_key)

    try:
        tx_id = client.send_transaction(signed_settle)
        print(f"[2/2] Submitted Settlement Tx ID: {tx_id}")
        print("Waiting for transaction confirmation on Algorand Testnet...")
        transaction.wait_for_confirmation(client, tx_id, 4)

        result = {
            "status": "SUCCESS",
            "action": "SETTLE",
            "payment_id": payment_id,
            "app_id": app_id,
            "state_transition": "LOCKED -> APPROVED -> SETTLED",
            "agent_address": agent_address,
            "provider_address": provider_address,
            "settled_amount": amount,
            "tx_id": tx_id,
        }

        print("\n==================================================")
        print(" SUCCESS! Payment Settled to Provider On-Chain")
        print("==================================================")
        print(f" Transaction ID:   {tx_id}")
        print(f" Lifecycle State:  LOCKED -> APPROVED -> SETTLED")
        print(f" Released Funds:   {amount} micro-units to {provider_address}")
        print("==================================================\n")
        return result

    except Exception as e:
        error_msg = str(e)
        if "assert failed" in error_msg.lower() or "logic eval error" in error_msg.lower():
            raise ValueError(f"REJECTED: Double settlement attempt or state assertion failed on-chain! Payment '{payment_id}' is already settled or not in LOCKED state.")
        print(f"❌ Settlement transaction error: {e}")
        raise e


def main():
    parser = argparse.ArgumentParser(description="Trigger SLAShield402 contract settlement on PASS.")
    parser.add_argument("--payment_id", type=str, default=DEFAULT_PAYMENT_ID, help="Unique payment ID reference")
    parser.add_argument("--agent", type=str, default=DEFAULT_AGENT_ADDR, help="Agent wallet address")
    parser.add_argument("--provider", type=str, default=DEFAULT_PROVIDER_ADDR, help="Provider wallet address")
    parser.add_argument("--amount", type=int, default=DEFAULT_PAYMENT_AMOUNT, help="Payment amount in micro-units")
    parser.add_argument("--app_id", type=int, default=DEFAULT_APP_ID, help="Escrow smart contract app ID")
    parser.add_argument("--caller", type=str, default=AUTHORIZED_BACKEND_ADDRESS, help="Caller wallet address")

    args = parser.parse_args()
    settle_payment(args.payment_id, args.agent, args.provider, args.amount, args.app_id, args.caller)


if __name__ == "__main__":
    main()
