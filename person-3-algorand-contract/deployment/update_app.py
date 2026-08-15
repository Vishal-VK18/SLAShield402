"""
Update SLAShield402 Escrow Smart Contract on Algorand Testnet (App #769236555).
"""

import os
import base64
import dotenv
from pyteal import compileTeal, Mode
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction
from contracts.slashield_escrow.contract import approval_program, clear_program

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT = int(os.getenv("ALGOD_PORT", 443))
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
DEFAULT_APP_ID = int(os.getenv("DEFAULT_APP_ID", 769236555))


def update_application(app_id: int = DEFAULT_APP_ID):
    print("==================================================")
    print(f"Updating Application #{app_id} on Algorand Testnet...")
    print("==================================================")

    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"User-Agent": "SLAShield402-Updater"})
    private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
    sender_address = account.address_from_private_key(private_key)

    # 1. Compile PyTeal to TEAL
    approval_teal = compileTeal(approval_program(), Mode.Application, version=8)
    clear_teal = compileTeal(clear_program(), Mode.Application, version=8)

    # 2. Compile TEAL to binary bytecode via Algod
    approval_compiled = client.compile(approval_teal)
    clear_compiled = client.compile(clear_teal)

    approval_bytes = base64.b64decode(approval_compiled["result"])
    clear_bytes = base64.b64decode(clear_compiled["result"])

    # 3. Create ApplicationUpdateTxn
    params = client.suggested_params()
    update_txn = transaction.ApplicationUpdateTxn(
        sender=sender_address,
        sp=params,
        index=app_id,
        approval_program=approval_bytes,
        clear_program=clear_bytes,
    )

    signed_update = update_txn.sign(private_key)
    txid = client.send_transaction(signed_update)
    print(f"Submitted Update Tx ID: {txid}")
    confirmed = transaction.wait_for_confirmation(client, txid, 4)
    print(f"Application Updated Successfully in Round #{confirmed['confirmed-round']}!")
    return txid


if __name__ == "__main__":
    update_application()
