"""
State definitions and constants for the SLAShield402 Escrow Smart Contract.
"""
from enum import Enum
from pyteal import Bytes, Int

class EscrowState(str, Enum):
    """
    Contract Lifecycle States:
    - UNINITIALIZED: Contract initialized, waiting for payment setup.
    - LOCKED: USDC/ALGO payment locked in escrow awaiting SLA evaluation.
    - APPROVED: SLA evaluation passed, preparing payout.
    - SETTLED: Payment successfully released to provider.
    - SLA_FAILED: SLA evaluation failed, preparing refund and slash.
    - REFUNDED_AND_PENALIZED: Escrow refunded to agent and provider bond slashed.
    """
    UNINITIALIZED = "UNINITIALIZED"
    LOCKED = "LOCKED"
    APPROVED = "APPROVED"
    SETTLED = "SETTLED"
    SLA_FAILED = "SLA_FAILED"
    REFUNDED_AND_PENALIZED = "REFUNDED_AND_PENALIZED"


# PyTeal Bytes constants for Global State Keys
KEY_AGENT_ADDRESS = Bytes("agent_address")
KEY_PROVIDER_ADDRESS = Bytes("provider_address")
KEY_PAYMENT_AMOUNT = Bytes("payment_amount")
KEY_PROVIDER_BOND_AMOUNT = Bytes("provider_bond_amount")
KEY_CURRENT_STATE = Bytes("current_state")
KEY_PAYMENT_ID = Bytes("payment_id")
KEY_AUTHORIZED_BACKEND = Bytes("authorized_backend")
KEY_USDC_ASA_ID = Bytes("usdc_asa_id")
BOND_PREFIX = "bond_"

# Plain String constants for SDK / PyTeal dictionary lookups
STR_AGENT_ADDRESS = "agent_address"
STR_PROVIDER_ADDRESS = "provider_address"
STR_PAYMENT_AMOUNT = "payment_amount"
STR_PROVIDER_BOND_AMOUNT = "provider_bond_amount"
STR_CURRENT_STATE = "current_state"
STR_PAYMENT_ID = "payment_id"
STR_AUTHORIZED_BACKEND = "authorized_backend"
STR_USDC_ASA_ID = "usdc_asa_id"
