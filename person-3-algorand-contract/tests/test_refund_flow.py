"""
Test Suite for SLAShield402 Escrow Refund & Penalty Flow.
Verifies state transitions: UNINITIALIZED -> LOCKED -> SLA_FAILED -> REFUNDED_AND_PENALIZED.
Verifies provider bond slashing logic and security guardrails.
"""
import pytest
import sys
import os

# Ensure package root is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from contracts.slashield_escrow.state import EscrowState
from contracts.slashield_escrow.bond import BondManager
from scripts.refundAndPenalize import refund_and_penalize


class MockEscrowContractWithBond:
    """Simulates smart contract instance with bond tracking for refund & slash testing."""

    def __init__(self, app_id: int, authorized_backend: str):
        self.app_id = app_id
        self.authorized_backend = authorized_backend
        self.current_state = EscrowState.UNINITIALIZED.value
        self.payment_id = None
        self.agent_address = None
        self.provider_address = None
        self.payment_amount = 0
        self.bond_manager = BondManager()

    def register_provider_bond(self, provider_addr: str, amount: int):
        return self.bond_manager.deposit_bond(provider_addr, amount)

    def create_payment(self, caller: str, agent_addr: str, provider_addr: str, payment_id: str, amount: int):
        if caller != self.authorized_backend:
            raise PermissionError("Reject: Only authorized backend can create payment")
        self.agent_address = agent_addr
        self.provider_address = provider_addr
        self.payment_id = payment_id
        self.payment_amount = amount
        self.current_state = EscrowState.LOCKED.value
        return "LOCKED"

    def fail_and_refund(self, caller: str, payment_id: str):
        if caller != self.authorized_backend:
            raise PermissionError("Reject: Unauthorized caller address")
        if self.current_state != EscrowState.LOCKED.value:
            raise ValueError(f"Reject: Cannot refund payment in state {self.current_state}. Escrow must be LOCKED.")
        if payment_id != self.payment_id:
            raise ValueError(f"Reject: Payment ID mismatch ('{payment_id}' != '{self.payment_id}')")

        self.current_state = EscrowState.SLA_FAILED.value
        
        # Slash provider bond
        slashed, remaining = self.bond_manager.slash_bond(self.provider_address)

        # Final state transition
        self.current_state = EscrowState.REFUNDED_AND_PENALIZED.value
        return "REFUNDED_AND_PENALIZED", slashed, remaining


def test_refund_flow_successful_with_bond_slash():
    """Test 1: Refund path verifies agent receives refund, provider bond slashed 10%, and state moves to REFUNDED_AND_PENALIZED."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    provider = "PROVIDER_WALLET_TEST_123"
    agent = "AGENT_WALLET_TEST_456"
    contract = MockEscrowContractWithBond(app_id=704102999, authorized_backend=backend)

    # Provider stakes 10 USDC bond (10,000,000 micro-units)
    initial_bond = contract.register_provider_bond(provider, 10_000_000)
    assert initial_bond == 10_000_000

    # Agent creates payment locked in contract
    contract.create_payment(caller=backend, agent_addr=agent, provider_addr=provider, payment_id="REQ-FAIL-001", amount=20000)
    assert contract.current_state == EscrowState.LOCKED.value

    # SLA evaluation fails -> trigger refund and penalize
    state, slashed, remaining = contract.fail_and_refund(caller=backend, payment_id="REQ-FAIL-001")

    assert state == EscrowState.REFUNDED_AND_PENALIZED.value
    assert contract.current_state == EscrowState.REFUNDED_AND_PENALIZED.value
    assert slashed == 1_000_000  # 10% penalty slashed (1 USDC)
    assert remaining == 9_000_000  # 9 USDC remaining bond balance


def test_reject_double_refund():
    """Test 2: Edge Case - Attempting double refund on already refunded payment must be rejected."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractWithBond(app_id=704102999, authorized_backend=backend)
    contract.register_provider_bond("PROV", 10_000_000)
    contract.create_payment(caller=backend, agent_addr="AG", provider_addr="PROV", payment_id="REQ-FAIL-001", amount=20000)

    # First refund succeeds
    contract.fail_and_refund(caller=backend, payment_id="REQ-FAIL-001")

    # Second refund attempt fails
    with pytest.raises(ValueError, match="Escrow must be LOCKED"):
        contract.fail_and_refund(caller=backend, payment_id="REQ-FAIL-001")


def test_reject_refund_on_already_settled_payment():
    """Test 3: Edge Case - Attempting to refund a payment that was already SETTLED must be rejected."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractWithBond(app_id=704102999, authorized_backend=backend)
    contract.create_payment(caller=backend, agent_addr="AG", provider_addr="PROV", payment_id="REQ-001", amount=20000)

    # Manually transition state to SETTLED
    contract.current_state = EscrowState.SETTLED.value

    with pytest.raises(ValueError, match="Escrow must be LOCKED"):
        contract.fail_and_refund(caller=backend, payment_id="REQ-001")


def test_reject_unauthorized_refund_caller():
    """Test 4: Edge Case - Calling fail_and_refund from unauthorized address must fail."""
    backend = "AUTHORIZED_BACKEND_ADDRESS_123"
    contract = MockEscrowContractWithBond(app_id=704102999, authorized_backend=backend)
    contract.create_payment(caller=backend, agent_addr="AG", provider_addr="PROV", payment_id="REQ-001", amount=20000)

    with pytest.raises(PermissionError, match="Unauthorized caller address"):
        contract.fail_and_refund(caller="UNAUTHORIZED_HACKER_ADDRESS", payment_id="REQ-001")


def test_refund_script_integration():
    """Test 5: Standalone refundAndPenalize.py script execution integration test."""
    res = refund_and_penalize(payment_id="REQ-FAIL-INTEGRATION-001", amount=20000)
    assert res["status"] == "SUCCESS"
    assert res["action"] == "REFUND_AND_PENALIZE"
    assert "REFUNDED_AND_PENALIZED" in res["state_transition"]
    assert res["slashed_bond_penalty"] > 0
