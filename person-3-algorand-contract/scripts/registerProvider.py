"""
Standalone script to register a provider with SLAShield402 by staking a bond deposit.
Submits an Application Call transaction on Algorand Testnet.

Usage:
  python scripts/registerProvider.py --provider <PROVIDER_ADDRESS> --amount <BOND_AMOUNT>
"""
import argparse
import sys
import os

# Ensure package root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from contracts.slashield_escrow.bond import BondManager, DEFAULT_MIN_BOND
from contracts.slashield_escrow.state import EscrowState
from deployment.deploy_config import (
    ALGOD_SERVER,
    ALGOD_PORT,
    ALGOD_TOKEN,
    DEPLOYER_MNEMONIC,
    AUTHORIZED_BACKEND_ADDRESS,
)

DEFAULT_APP_ID = 769236555
DEFAULT_PROVIDER_ADDR = AUTHORIZED_BACKEND_ADDRESS or "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"


def register_provider(provider_address: str, bond_amount: int, app_id: int = DEFAULT_APP_ID) -> dict:
    """
    Registers provider bond on the SLAShield402 testnet smart contract.
    """
    print("==================================================")
    print("      SLAShield402 Provider Bond Registration     ")
    print("==================================================")
    print(f" Target Contract App ID: {app_id}")
    print(f" Provider Address:       {provider_address}")
    print(f" Staked Bond Amount:     {bond_amount} micro-units ({bond_amount / 1_000_000:.2f} USDC/ALGO)")
    print("--------------------------------------------------")

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"User-Agent": "SLAShield402-Script"})
    private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
    sender_address = account.address_from_private_key(private_key)

    params = client.suggested_params()

    # App call arguments: ["register_provider_bond", provider_address, bond_amount]
    app_args = [
        b"register_provider_bond",
        provider_address.encode("utf-8"),
        bond_amount.to_bytes(8, "big"),
    ]

    app_call_txn = transaction.ApplicationNoOpTxn(
        sender=sender_address,
        sp=params,
        index=app_id,
        app_args=app_args,
    )

    signed_txn = app_call_txn.sign(private_key)

    try:
        tx_id = client.send_transaction(signed_txn)
        print(f"Submitted On-Chain Transaction ID: {tx_id}")
        print("Waiting for transaction confirmation...")
        transaction.wait_for_confirmation(client, tx_id, 4)

        bond_mgr = BondManager()
        new_balance = bond_mgr.deposit_bond(provider_address, bond_amount)

        result = {
            "status": "SUCCESS",
            "action": "REGISTER_PROVIDER_BOND",
            "app_id": app_id,
            "provider_address": provider_address,
            "staked_amount": bond_amount,
            "total_bond_balance": new_balance,
            "tx_id": tx_id,
        }

        print("\n==================================================")
        print(" SUCCESS! Provider Bond Registered On-Chain")
        print("==================================================")
        print(f" Transaction ID:     {tx_id}")
        print(f" Total Bond Balance: {new_balance} micro-units")
        print("==================================================\n")
        return result

    except Exception as e:
        print(f"❌ Error submitting transaction to testnet: {e}")
        raise e


def main():
    parser = argparse.ArgumentParser(description="Register provider bond with SLAShield402 contract.")
    parser.add_argument("--provider", type=str, default=DEFAULT_PROVIDER_ADDR, help="Provider Algorand wallet address")
    parser.add_argument("--amount", type=int, default=DEFAULT_MIN_BOND, help="Staked bond amount in micro-units")
    parser.add_argument("--app_id", type=int, default=DEFAULT_APP_ID, help="Escrow smart contract application ID")

    args = parser.parse_args()
    register_provider(args.provider, args.amount, args.app_id)


if __name__ == "__main__":
    main()
