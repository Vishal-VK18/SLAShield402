import algosdk from 'algosdk';
import { getPrimaryAccount, getSecondaryAccount, getActivePayerAccount } from './wallets.js';

const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';
const USDC_ASA_ID = 10458941;

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

interface WalletInfo {
  address: string;
  algoBalance: number;
  usdcOptedIn: boolean;
  usdcBalanceMicro: bigint;
  usdcBalanceFormatted: string;
}

async function fetchWalletInfo(address: string): Promise<WalletInfo> {
  try {
    const info = await algodClient.accountInformation(address).do();
    const algoBalance = Number(info.amount) / 1e6;
    const usdcAsset = info.assets?.find((a: any) => Number(a.assetId || a['asset-id']) === USDC_ASA_ID);

    if (usdcAsset) {
      const micro = BigInt(usdcAsset.amount?.toString() || '0');
      return {
        address,
        algoBalance,
        usdcOptedIn: true,
        usdcBalanceMicro: micro,
        usdcBalanceFormatted: `${(Number(micro) / 1e6).toFixed(6)} USDC (${micro.toString()} micro-units)`,
      };
    } else {
      return {
        address,
        algoBalance,
        usdcOptedIn: false,
        usdcBalanceMicro: BigInt(0),
        usdcBalanceFormatted: 'not opted in',
      };
    }
  } catch (err: any) {
    return {
      address,
      algoBalance: 0,
      usdcOptedIn: false,
      usdcBalanceMicro: BigInt(0),
      usdcBalanceFormatted: `Error fetching info: ${err.message}`,
    };
  }
}

async function main() {
  console.log('======================================================================');
  console.log('🏛️  SLAShield402 — ALGORAND TESTNET WALLET STATUS');
  console.log('======================================================================');

  // 1. PRIMARY WALLET
  const primaryAccount = getPrimaryAccount();
  const primaryAddress = primaryAccount.addr.toString();
  const primaryInfo = await fetchWalletInfo(primaryAddress);

  console.log('\n🔵 PRIMARY WALLET (Main Project Deployer & Default Payer):');
  console.log(`  • Address:      ${primaryInfo.address}`);
  console.log(`  • ALGO Balance: ${primaryInfo.algoBalance} ALGO`);
  console.log(`  • USDC Status:  ${primaryInfo.usdcOptedIn ? '✅ Opted-in' : '❌ Not opted-in'}`);
  console.log(`  • USDC Balance: ${primaryInfo.usdcBalanceFormatted}`);

  // 2. SECONDARY WALLET
  const secondaryAccount = getSecondaryAccount();
  let secondaryAddress: string | null = null;
  let secondaryInfo: WalletInfo | null = null;

  console.log('\n🟣 SECONDARY WALLET (Optional Test Payer):');
  if (secondaryAccount) {
    secondaryAddress = secondaryAccount.addr.toString();
    secondaryInfo = await fetchWalletInfo(secondaryAddress);
    console.log(`  • Address:      ${secondaryInfo.address}`);
    console.log(`  • ALGO Balance: ${secondaryInfo.algoBalance} ALGO`);
    console.log(`  • USDC Status:  ${secondaryInfo.usdcOptedIn ? '✅ Opted-in' : '❌ Not opted-in'}`);
    console.log(`  • USDC Balance: ${secondaryInfo.usdcBalanceFormatted}`);
  } else {
    console.log('  • Status:       (Not configured in .env)');
    console.log('  • Tip:          Run `npm run wallet:create-secondary` to generate one.');
  }

  // 3. COMPARISON & SELECTION
  console.log('\n----------------------------------------------------------------------');
  console.log('🔍 WALLET VALIDATION & SELECTION STATUS:');
  console.log('----------------------------------------------------------------------');
  if (secondaryAddress) {
    const isSame = primaryAddress === secondaryAddress;
    console.log(`  • PRIMARY == SECONDARY: ${isSame}`);
    console.log(`  • Primary unchanged:    ${primaryAddress === 'YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ' ? 'YES' : 'NO'}`);
  }

  const activePayer = getActivePayerAccount();
  console.log(`  • Active Selection:     [${activePayer.type.toUpperCase()}] ${activePayer.address}`);
  console.log(`  • PAYMENT_WALLET Env:   ${process.env.PAYMENT_WALLET || '(default: primary)'}`);
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('Wallet status check error:', err.message);
  process.exit(1);
});
