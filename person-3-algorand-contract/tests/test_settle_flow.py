"""
Test Suite for SLAShield402 Escrow Settle Flow.
Verifies state transitions: UNINITIALIZED -> LOCKED -> APPROVED -> SETTLED.
Verifies guardrails against double settlement and unauthorized callers.
"""
import pytest
import sys
import os

# Ensure package root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contracts.slashield_escrow.state import EscrowState
from contracts.slashield_escrow.bond import BondManager
from scripts.settle import settle_payment


class MockEscrowContractInstance:
    """Simulates smart contract instance state and guardrails for fast automated pytest execution."""

    def __init__(self, app_id: int, authorized_backend: str):
        self.app_id = app_id
        self.authorized_backend = authorized_backend
        self.current_state = EscrowState.UNINITIALIZED.value
        self.payment_id = None
        self.agent_address = None
        self.provider_address = None
        self.payment_amount = 0
        self.usdc_asa_id = 0

    def create_payment(self, caller: str, agent_addr: str, provider_addr: str, payment_id: str, amount: int, asa_id: int = 67522432):
        if caller != self.authorized_backend:
            raise PermissionError("Reject: Only authorized backend address can create escrow payments")
        if self.current_state not in (EscrowState.UNINITIALIZED.value, EscrowState.SETTLED.value, EscrowState.REFUNDED_AND_PENALIZED.value):
            raise ValueError(f"Reject: Contract currently locked in state {self.current_state}")
        if amount <= 0:
            raise ValueError("Reject: Payment amount must be positive")

        self.agent_address = agent_addr
        self.provider_address = provider_addr
        self.payment_id = payment_id
        self.payment_amount = amount
        self.usdc_asa_id = asa_id
        self.current_state = EscrowState.LOCKED.value
        return "LOCKED"

    def approve_and_settle(self, caller: str, payment_id: str):
        if caller != self.authorized_backend:
            raise PermissionError("Reject: Unauthorized caller address")
        if self.current_state != EscrowState.LOCKED.value:
            raise ValueError(f"Reject: Cannot settle payment in state {self.current_state}. Escrow must be LOCKED.")
        if payment_id != self.payment_id:
            raise ValueError(f"Reject: Payment ID mismatch ('{payment_id}' != '{self.payment_id}')")

        self.current_state = EscrowState.APPROVED.value
        # Simulate payment transfer to provider address
        self.current_state = EscrowState.SETTLED.value
        return "SETTLED"


def test_create_payment_moves_to_locked():
    """Test 1: Creating a payment moves state from UNINITIALIZED to LOCKED."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractInstance(app_id=704102999, authorized_backend=backend)

    assert contract.current_state == EscrowState.UNINITIALIZED.value

    state = contract.create_payment(
        caller=backend,
        agent_addr="AGENT_123",
        provider_addr="PROVIDER_456",
        payment_id="REQ-TEST-001",
        amount=20000,
    )

    assert state == EscrowState.LOCKED.value
    assert contract.current_state == EscrowState.LOCKED.value
    assert contract.payment_id == "REQ-TEST-001"
    assert contract.payment_amount == 20000


def test_settle_flow_successful():
    """Test 2: Full happy path settlement moves state to APPROVED -> SETTLED."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractInstance(app_id=704102999, authorized_backend=backend)

    contract.create_payment(
        caller=backend,
        agent_addr="AGENT_123",
        provider_addr="PROVIDER_456",
        payment_id="REQ-TEST-001",
        amount=20000,
    )

    state = contract.approve_and_settle(caller=backend, payment_id="REQ-TEST-001")
    assert state == EscrowState.SETTLED.value
    assert contract.current_state == EscrowState.SETTLED.value


def test_reject_double_settlement():
    """Test 3: Edge Case - Double settlement attempt on already settled payment_id must fail."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractInstance(app_id=704102999, authorized_backend=backend)

    contract.create_payment(caller=backend, agent_addr="A", provider_addr="P", payment_id="REQ-001", amount=20000)
    contract.approve_and_settle(caller=backend, payment_id="REQ-001")

    # Attempting to settle again must raise ValueError
    with pytest.raises(ValueError, match="Escrow must be LOCKED"):
        contract.approve_and_settle(caller=backend, payment_id="REQ-001")


def test_reject_unauthorized_settlement_caller():
    """Test 4: Edge Case - Random unauthorized wallet caller attempting settlement must fail."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractInstance(app_id=704102999, authorized_backend=backend)

    contract.create_payment(caller=backend, agent_addr="A", provider_addr="P", payment_id="REQ-001", amount=20000)

    # Calling from attacker address must raise PermissionError
    with pytest.raises(PermissionError, match="Unauthorized caller address"):
        contract.approve_and_settle(caller="ATTACKER_WALLET_ADDRESS_999", payment_id="REQ-001")


def test_settle_script_integration():
    """Test 5: Standalone settle.py script execution integration test."""
    res = settle_payment(payment_id="REQ-TEST-INTEGRATION-001", amount=20000)
    assert res["status"] == "SUCCESS"
    assert res["action"] == "SETTLE"
    assert "SETTLED" in res["state_transition"]
