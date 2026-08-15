"""
SLAShield402 - Opt-In Wallet & Smart Contract to Circle Testnet USDC ASA (10458941)
"""

import os
import dotenv
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT = int(os.getenv("ALGOD_PORT", 443))
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
USDC_ASA_ID = int(os.getenv("USDC_ASA_ID", 10458941))
DEFAULT_APP_ID = int(os.getenv("DEFAULT_APP_ID", 769236555))


def opt_in_account_to_usdc(asa_id: int = USDC_ASA_ID) -> str:
    """
    Submits an AssetTransfer transaction with amount=0 to opt the deployer account into ASA.
    """
    client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"User-Agent": "SLAShield402-OptIn"})
    private_key = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
    sender_address = account.address_from_private_key(private_key)

    params = client.suggested_params()

    print(f"Submitting Opt-In for Deployer Wallet: {sender_address} to ASA #{asa_id}...")
    txn = transaction.AssetTransferTxn(
        sender=sender_address,
        sp=params,
        receiver=sender_address,
        amt=0,
        index=asa_id,
    )
    signed_txn = txn.sign(private_key)
    txid = client.send_transaction(signed_txn)
    print(f"Opt-in Transaction Submitted: {txid}")
    confirmed = transaction.wait_for_confirmation(client, txid, 4)
    print(f"CONFIRMED in Round #{confirmed['confirmed-round']}!")
    return txid


if __name__ == "__main__":
    opt_in_account_to_usdc()
