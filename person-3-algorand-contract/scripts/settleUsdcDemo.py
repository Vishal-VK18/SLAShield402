"""
SLAShield402 - USDC ASA Settlement Demo Script
Explicitly passes `usdc_asa_id` (10458941) to `create_payment`,
demonstrating smart contract execution via the AssetTransfer (axfer) branch.
"""

import os
import argparse
import dotenv
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction, encoding

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT = int(os.getenv("ALGOD_PORT", 443))
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
AUTHORIZED_BACKEND_ADDRESS = os.getenv("AUTHORIZED_BACKEND_ADDRESS", "")
USDC_ASA_ID = int(os.getenv("USDC_ASA_ID", 10458941))

DEFAULT_APP_ID = int(os.getenv("DEFAULT_APP_ID", 769236555))
DEFAULT_PAYMENT_ID = "REQ-USDC-PROOF-001"
DEFAULT_AGENT_ADDR = AUTHORIZED_BACKEND_ADDRESS or "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"
DEFAULT_PROVIDER_ADDR = AUTHORIZED_BACKEND_ADDRESS or "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"
DEFAULT_PAYMENT_AMOUNT = 20_000  # 0.02 USDC (6 decimals)


def settle_usdc_payment(
    payment_id: str = DEFAULT_PAYMENT_ID,
    agent_address: str = DEFAULT_AGENT_ADDR,
    provider_address: str = DEFAULT_PROVIDER_ADDR,
    amount: int = DEFAULT_PAYMENT_AMOUNT,
    usdc_asa_id: int = USDC_ASA_ID,
    app_id: int = DEFAULT_APP_ID,
    caller: str = AUTHORIZED_BACKEND_ADDRESS,
) -> dict:
    """
    Executes approve_and_settle on the SLAShield402 smart contract on Algorand Testnet,
    explicitly routing through the USDC ASA AssetTransfer branch.
    """
    print("==================================================")
    print("  SLAShield402 USDC ASA Settlement Execution      ")
    print("==================================================")
    print(f" Target Contract App ID: {app_id}")
    print(f" Target USDC ASA ID:     {usdc_asa_id} (Circle Testnet USDC)")
    print(f" Payment ID:             {payment_id}")
    print(f" Agent Address:          {agent_address}")
    print(f" Provider Address:       {provider_address}")
    print(f" Settlement Amount:      {amount} micro-units ({amount / 1_000_000:.4f} USDC)")
    print("--------------------------------------------------")

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"User-Agent": "SLAShield402-USDC-Demo"})

    # Load signing account
    try:
        private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
        sender_address = account.address_from_private_key(private_key)
    except Exception:
        private_key, sender_address = account.generate_account()

    effective_caller = caller or sender_address
    if AUTHORIZED_BACKEND_ADDRESS and effective_caller != AUTHORIZED_BACKEND_ADDRESS:
        raise PermissionError(f"Reject: Caller '{effective_caller}' is unauthorized.")

    params = client.suggested_params()

    # Decode 58-char Algorand addresses to 32 raw bytes for TEAL
    raw_agent_bytes = encoding.decode_address(agent_address)
    raw_provider_bytes = encoding.decode_address(provider_address)

    # 1. Create/lock payment on contract passing the 6th parameter (usdc_asa_id)
    create_args = [
        b"create_payment",
        raw_agent_bytes,
        raw_provider_bytes,
        payment_id.encode("utf-8"),
        amount.to_bytes(8, "big"),
        usdc_asa_id.to_bytes(8, "big"),  # 6th arg: USDC ASA ID (10458941)
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
        print(f"[1/2] USDC Escrow Payment Locked On-Chain (Tx ID: {tx_create_id})")
    except Exception as e:
        print(f"[1/2] Payment creation note: {e}")

    # 2. Execute approve_and_settle
    settle_args = [
        b"approve_and_settle",
        payment_id.encode("utf-8"),
    ]

    params = client.suggested_params()
    params.fee = 2000
    params.flat_fee = True
    # When smart contract executes inner AssetTransfer, foreign_assets=[usdc_asa_id] must be passed
    settle_txn = transaction.ApplicationNoOpTxn(
        sender=sender_address,
        sp=params,
        index=app_id,
        app_args=settle_args,
        foreign_assets=[usdc_asa_id] if usdc_asa_id > 0 else None,
    )
    signed_settle = settle_txn.sign(private_key)

    try:
        tx_id = client.send_transaction(signed_settle)
        print(f"[2/2] Submitted Settlement Tx ID: {tx_id}")
        print("Waiting for transaction confirmation on Algorand Testnet...")
        confirmed = transaction.wait_for_confirmation(client, tx_id, 4)

        result = {
            "status": "SUCCESS",
            "action": "SETTLE_USDC",
            "payment_id": payment_id,
            "app_id": app_id,
            "asa_id": usdc_asa_id,
            "state_transition": "LOCKED -> APPROVED -> SETTLED",
            "agent_address": agent_address,
            "provider_address": provider_address,
            "settled_amount": amount,
            "tx_id": tx_id,
            "confirmed_round": confirmed.get("confirmed-round"),
        }

        print("\n==================================================")
        print(" SUCCESS! USDC Payment Settled via ASA Transfer")
        print("==================================================")
        print(f" Transaction ID:   {tx_id}")
        print(f" ASA ID:           {usdc_asa_id}")
        print(f" Lifecycle State:  LOCKED -> APPROVED -> SETTLED")
        print(f" Released Funds:   {amount} micro-units USDC to {provider_address}")
        print("==================================================\n")
        return result

    except Exception as e:
        error_msg = str(e)
        raise RuntimeError(f"Smart Contract USDC Settlement Failed: {error_msg}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SLAShield402 USDC Settlement Script")
    parser.add_argument("--payment_id", type=str, default=DEFAULT_PAYMENT_ID, help="Payment ID")
    parser.add_argument("--amount", type=int, default=DEFAULT_PAYMENT_AMOUNT, help="Amount in micro-units (USDC)")
    parser.add_argument("--asa_id", type=int, default=USDC_ASA_ID, help="USDC ASA ID")
    parser.add_argument("--agent", type=str, default=DEFAULT_AGENT_ADDR, help="Agent Address")
    parser.add_argument("--provider", type=str, default=DEFAULT_PROVIDER_ADDR, help="Provider Address")
    parser.add_argument("--app_id", type=int, default=DEFAULT_APP_ID, help="Smart Contract Application ID")

    args = parser.parse_args()
    settle_usdc_payment(
        payment_id=args.payment_id,
        amount=args.amount,
        usdc_asa_id=args.asa_id,
        agent_address=args.agent,
        provider_address=args.provider,
        app_id=args.app_id,
    )
