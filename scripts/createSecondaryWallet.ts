import algosdk from 'algosdk';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getSecondaryAccount } from './wallets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isForce = process.argv.includes('--force');
const existingSecondary = getSecondaryAccount();

if (existingSecondary && !isForce) {
  console.log('============================================================');
  console.log('⚠️  SECONDARY WALLET ALREADY CONFIGURED');
  console.log('============================================================');
  console.log(`Public Address: ${existingSecondary.addr.toString()}`);
  console.log('\nTo generate a new secondary wallet and overwrite, run:');
  console.log('  npm run wallet:create-secondary -- --force');
  console.log('============================================================');
  process.exit(0);
}

// Generate new random Algorand account
const newAccount = algosdk.generateAccount();
const newMnemonic = algosdk.secretKeyToMnemonic(newAccount.sk);
const newAddress = newAccount.addr.toString();

// Append or update in person-3-algorand-contract/.env
const p3EnvPath = path.resolve(__dirname, '../person-3-algorand-contract/.env');
if (fs.existsSync(p3EnvPath)) {
  let envContent = fs.readFileSync(p3EnvPath, 'utf8');
  if (envContent.includes('SECONDARY_TEST_MNEMONIC=')) {
    envContent = envContent.replace(
      /SECONDARY_TEST_MNEMONIC=.*/g,
      `SECONDARY_TEST_MNEMONIC="${newMnemonic}"`
    );
  } else {
    envContent += `\n# Temporary Secondary Test Wallet (Opt-in for testing non-zero USDC flow)\nSECONDARY_TEST_MNEMONIC="${newMnemonic}"\n`;
  }
  fs.writeFileSync(p3EnvPath, envContent, 'utf8');
}

// Also update root .env if it exists
const rootEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(rootEnvPath)) {
  let rootEnvContent = fs.readFileSync(rootEnvPath, 'utf8');
  if (rootEnvContent.includes('SECONDARY_TEST_MNEMONIC=')) {
    rootEnvContent = rootEnvContent.replace(
      /SECONDARY_TEST_MNEMONIC=.*/g,
      `SECONDARY_TEST_MNEMONIC="${newMnemonic}"`
    );
  } else {
    rootEnvContent += `\n# Temporary Secondary Test Wallet\nSECONDARY_TEST_MNEMONIC="${newMnemonic}"\n`;
  }
  fs.writeFileSync(rootEnvPath, rootEnvContent, 'utf8');
}

console.log('============================================================');
console.log('✨ NEW SECONDARY TEST WALLET GENERATED');
console.log('============================================================');
console.log(`Public Address: ${newAddress}`);
console.log('\nSaved securely to local .env:');
console.log(`SECONDARY_TEST_MNEMONIC="${newMnemonic}"`);
console.log('\n📋 NEXT STEPS:');
console.log('1. Fund with ALGO for testnet gas: https://lora.algokit.io/testnet/fund');
console.log('   (Enter address above)');
console.log('2. Opt-in to Circle USDC ASA (ID: 10458941):');
console.log('   npm run wallet:optin-secondary');
console.log('3. Request Testnet USDC from Circle Faucet:');
console.log('   https://faucet.circle.com (Select Algorand Testnet)');
console.log('4. Check status anytime:');
console.log('   npm run wallet:status');
console.log('============================================================');
