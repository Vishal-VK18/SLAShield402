import os
import dotenv
from algosdk.v2client import algod
from algosdk import account, mnemonic, transaction

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")
DEPLOYER_MNEMONIC = os.getenv("DEPLOYER_MNEMONIC", "")
APP_ID = int(os.getenv("DEFAULT_APP_ID", 769236555))
APP_ADDR = "4IXAMX45CUWKRHQEGUMAIHT45ABGOMO2LK6P5V2BHHLXNCOMSYDOJNCUXA"

client = algod.AlgodClient(ALGOD_TOKEN, ALGOD_SERVER)
pk = mnemonic.to_private_key(DEPLOYER_MNEMONIC)
sender = account.address_from_private_key(pk)
sp = client.suggested_params()

print("1. Creating Testnet USDC ASA on Algorand...")
create_asa_txn = transaction.AssetCreateTxn(
    sender=sender,
    sp=sp,
    total=1_000_000_000_000,  # 1,000,000 USDC
    decimals=6,
    default_frozen=False,
    unit_name="USDC",
    asset_name="SLAShield402 Testnet USDC",
    manager=sender,
    reserve=sender,
    freeze=sender,
    clawback=sender,
    url="https://slashield402.algo"
)
txid_create = client.send_transaction(create_asa_txn.sign(pk))
confirmed_create = transaction.wait_for_confirmation(client, txid_create, 4)
asa_id = confirmed_create["asset-index"]
print(f"Created USDC ASA ID: {asa_id} (Tx ID: {txid_create}) in Round #{confirmed_create['confirmed-round']}")

print(f"\n2. Opting Smart Contract (App #{APP_ID}) into ASA #{asa_id}...")
sp = client.suggested_params()
sp.fee = 2000
sp.flat_fee = True
opt_txn = transaction.ApplicationNoOpTxn(
    sender=sender,
    sp=sp,
    index=APP_ID,
    app_args=[b"opt_in_asset", asa_id.to_bytes(8, "big")],
    foreign_assets=[asa_id]
)
txid_opt = client.send_transaction(opt_txn.sign(pk))
confirmed_opt = transaction.wait_for_confirmation(client, txid_opt, 4)
print(f"Contract Opted In (Tx ID: {txid_opt}) in Round #{confirmed_opt['confirmed-round']}")

print(f"\n3. Funding Smart Contract with 10.0 USDC (10,000,000 micro-units)...")
sp = client.suggested_params()
fund_txn = transaction.AssetTransferTxn(
    sender=sender,
    sp=sp,
    receiver=APP_ADDR,
    amt=10_000_000,
    index=asa_id
)
txid_fund = client.send_transaction(fund_txn.sign(pk))
confirmed_fund = transaction.wait_for_confirmation(client, txid_fund, 4)
print(f"Contract Funded with 10 USDC (Tx ID: {txid_fund}) in Round #{confirmed_fund['confirmed-round']}")

print(f"\nASA Setup Complete! ASA ID: {asa_id}")
