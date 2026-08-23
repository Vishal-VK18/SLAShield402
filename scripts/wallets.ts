import algosdk from 'algosdk';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local environment files
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../person-3-algorand-contract/.env') });

export interface PayerAccountSelection {
  account: algosdk.Account;
  type: 'primary' | 'secondary';
  address: string;
}

/**
 * Returns the Primary / Main Algorand Account (DEPLOYER_MNEMONIC).
 * MUST remain the unchanged main project wallet.
 */
export function getPrimaryAccount(): algosdk.Account {
  const mnemonic = process.env.DEPLOYER_MNEMONIC || process.env.AVM_MNEMONIC;
  if (!mnemonic) {
    throw new Error('PRIMARY wallet mnemonic (DEPLOYER_MNEMONIC) is not configured in .env.');
  }
  return algosdk.mnemonicToSecretKey(mnemonic.trim());
}

/**
 * Returns the optional Secondary Test Algorand Account (SECONDARY_TEST_MNEMONIC).
 * Returns null if not configured.
 */
export function getSecondaryAccount(): algosdk.Account | null {
  const mnemonic = process.env.SECONDARY_TEST_MNEMONIC;
  if (!mnemonic || !mnemonic.trim()) {
    return null;
  }
  try {
    return algosdk.mnemonicToSecretKey(mnemonic.trim());
  } catch (err: any) {
    throw new Error(`Failed to derive secondary wallet from SECONDARY_TEST_MNEMONIC: ${err.message}`);
  }
}

/**
 * Derives the active payer account based on PAYMENT_WALLET environment variable.
 * Default is strictly 'primary'.
 * If 'secondary' is requested but SECONDARY_TEST_MNEMONIC is missing, throws an error.
 */
export function getActivePayerAccount(): PayerAccountSelection {
  const selection = (process.env.PAYMENT_WALLET || 'primary').trim().toLowerCase();

  if (selection === 'secondary') {
    const secondary = getSecondaryAccount();
    if (!secondary) {
      throw new Error(
        'Secondary wallet requested (PAYMENT_WALLET=secondary), but SECONDARY_TEST_MNEMONIC is not configured in .env.'
      );
    }
    return {
      account: secondary,
      type: 'secondary',
      address: secondary.addr.toString(),
    };
  }

  // Default: Primary Wallet
  const primary = getPrimaryAccount();
  return {
    account: primary,
    type: 'primary',
    address: primary.addr.toString(),
  };
}

/**
 * Helper to get public address from an account safely.
 */
export function getAccountAddress(account: algosdk.Account): string {
  return account.addr.toString();
}
