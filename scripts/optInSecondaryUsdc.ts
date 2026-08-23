import algosdk from 'algosdk';
import { getSecondaryAccount } from './wallets.js';

const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';
const USDC_ASA_ID = 10458941;

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

async function main() {
  const secondary = getSecondaryAccount();
  if (!secondary) {
    console.error('❌ Error: SECONDARY_TEST_MNEMONIC is not configured in .env.');
    console.log('Run `npm run wallet:create-secondary` first.');
    process.exit(1);
  }

  const senderAddr = secondary.addr.toString();
  console.log(`Checking account status for secondary wallet: ${senderAddr}...`);

  const info = await algodClient.accountInformation(senderAddr).do();
  const algoBalance = Number(info.amount) / 1e6;

  if (algoBalance < 0.1) {
    console.error(`❌ Insufficient ALGO for opt-in transaction fee and MBR.`);
    console.error(`Current Balance: ${algoBalance} ALGO (Need at least 0.2 ALGO).`);
    console.log(`👉 Please fund this address via Lora dispenser: https://lora.algokit.io/testnet/fund`);
    console.log(`   Address: ${senderAddr}`);
    process.exit(1);
  }

  const alreadyOpted = info.assets?.some((a: any) => Number(a.assetId || a['asset-id']) === USDC_ASA_ID);
  if (alreadyOpted) {
    console.log(`✅ Secondary wallet ${senderAddr} is ALREADY opted-in to USDC ASA ID ${USDC_ASA_ID}!`);
    process.exit(0);
  }

  console.log(`Sending opt-in transaction for USDC ASA ID ${USDC_ASA_ID}...`);
  const params = await algodClient.getTransactionParams().do();
  const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: senderAddr,
    receiver: senderAddr,
    assetIndex: USDC_ASA_ID,
    amount: 0,
    suggestedParams: params,
  });

  const signedTxn = optInTxn.signTxn(secondary.sk);
  const txId = optInTxn.txID();

  await algodClient.sendRawTransaction(signedTxn).do();
  console.log(`Transaction submitted with ID: ${txId}`);
  console.log('Waiting for confirmation on Algorand Testnet...');

  const confirmed = await algosdk.waitForConfirmation(algodClient, txId, 4);
  console.log(`🎉 Opt-in confirmed in round ${confirmed['confirmed-round']}!`);
  console.log(`Explorer Link: https://lora.algokit.io/testnet/transaction/${txId}`);
}

main().catch(err => {
  console.error('Opt-in error:', err.message);
  process.exit(1);
});
