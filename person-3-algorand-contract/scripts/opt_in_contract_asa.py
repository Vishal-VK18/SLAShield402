import os
import dotenv
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
USDC_ASA_ID = int(os.getenv("USDC_ASA_ID", 10458941))
APP_ID = int(os.getenv("DEFAULT_APP_ID", 769236555))
APP_ADDR = "4IXAMX45CUWKRHQEGUMAIHT45ABGOMO2LK6P5V2BHHLXNCOMSYDOJNCUXA"

client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
pk = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
sender = account.address_from_private_key(pk)
sp = client.suggested_params()

print("1. Funding Contract MBR with 0.5 ALGO...")
pay_txn = transaction.PaymentTxn(sender=sender, sp=sp, receiver=APP_ADDR, amt=500_000)
txid_pay = client.send_transaction(pay_txn.sign(pk))
transaction.wait_for_confirmation(client, txid_pay, 4)
print(f"Contract Funded (Tx ID: {txid_pay})")

print("2. Calling opt_in_asset on App #769236555 for USDC ASA #10458941...")
sp = client.suggested_params()
# Contract inner transaction needs 2000 microAlgos fee allowance (fee pooling)
sp.fee = 2000
sp.flat_fee = True

opt_txn = transaction.ApplicationNoOpTxn(
    sender=sender,
    sp=sp,
    index=APP_ID,
    app_args=[b"opt_in_asset", USDC_ASA_ID.to_bytes(8, "big")],
    foreign_assets=[USDC_ASA_ID]
)
txid_opt = client.send_transaction(opt_txn.sign(pk))
confirmed = transaction.wait_for_confirmation(client, txid_opt, 4)
print(f"Contract Successfully Opted Into USDC ASA (Tx ID: {txid_opt}) in Round #{confirmed['confirmed-round']}!")
