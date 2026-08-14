"""
Provider Bond Manager for SLAShield402.
Handles provider registration, bond deposits, slash penalties on SLA failure, and reading bond balances.
"""
from pyteal import Bytes, Concat, Expr
from contracts.slashield_escrow.state import BOND_PREFIX

# Default fixed penalty micro-units or percentage for MVP bond slashing
DEFAULT_SLASH_PERCENTAGE = 10  # 10% slash penalty on SLA failure
DEFAULT_MIN_BOND = 10_000_000  # 10 USDC or 10 ALGO in micro-units


def get_bond_state_key(provider_address_bytes: Expr) -> Expr:
    """Returns PyTeal expression for the global state key storing a provider's bond balance."""
    return Concat(Bytes(BOND_PREFIX), provider_address_bytes)


class BondManager:
    """
    Python class for off-chain provider bond balance calculations, slashing, and simulation.
    """
    def __init__(self, slash_percentage: int = DEFAULT_SLASH_PERCENTAGE):
        self.slash_percentage = slash_percentage
        # In-memory dictionary tracking provider bond balances for Python simulation/testing
        self._provider_bonds: dict[str, int] = {}

    def deposit_bond(self, provider_address: str, amount: int) -> int:
        """
        Deposits bond amount for a provider to register with SLAShield402.
        """
        if amount <= 0:
            raise ValueError("Bond deposit amount must be positive")
        current_bond = self._provider_bonds.get(provider_address, 0)
        new_bond = current_bond + amount
        self._provider_bonds[provider_address] = new_bond
        return new_bond

    def slash_bond(self, provider_address: str, slash_amount: int | None = None) -> tuple[int, int]:
        """
        Slashes a penalty from provider's staked bond on SLA failure.
        If slash_amount is not specified, slashes `slash_percentage` % of current bond balance.
        Returns tuple of (slashed_penalty_amount, remaining_bond_balance).
        """
        current_bond = self._provider_bonds.get(provider_address, 0)
        if current_bond <= 0:
            return (0, 0)

        if slash_amount is None:
            # Slashes percentage (e.g. 10%)
            slashed = (current_bond * self.slash_percentage) // 100
        else:
            slashed = min(slash_amount, current_bond)

        remaining = current_bond - slashed
        self._provider_bonds[provider_address] = remaining
        return (slashed, remaining)

    def read_bond(self, provider_address: str) -> int:
        """
        Reads provider's current staked bond balance.
        """
        return self._provider_bonds.get(provider_address, 0)
