"""
Deployment configuration for SLAShield402 Escrow smart contract.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Algorand Testnet Node Connection Details (Algonode public testnet API)
ALGOD_SERVER = os.getenv("ALGOD_SERVER", "https://testnet-api.algonode.cloud")
ALGOD_PORT = int(os.getenv("ALGOD_PORT", "443"))
ALGOD_TOKEN = os.getenv("ALGOD_TOKEN", "")

INDEXER_SERVER = os.getenv("INDEXER_SERVER", "https://testnet-idx.algonode.cloud")
INDEXER_PORT = int(os.getenv("INDEXER_PORT", "443"))
INDEXER_TOKEN = os.getenv("INDEXER_TOKEN", "")

# Confirmed Algorand Testnet USDC ASA ID (Circle official USDC on Testnet)
USDC_ASA_ID = int(os.getenv("USDC_ASA_ID", "10458941"))

# Backend Authorized Deployer / Caller Account Mnemonic & Address
DEPLOYER_MNEMONIC = os.getenv(
    "DEPLOYER_MNEMONIC",
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon art"
)

AUTHORIZED_BACKEND_ADDRESS = os.getenv("AUTHORIZED_BACKEND_ADDRESS", "")
