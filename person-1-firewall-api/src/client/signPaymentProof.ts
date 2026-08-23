import algosdk from 'algosdk';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../person-3-algorand-contract/.env') });

const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';
const DEFAULT_USDC_ASA_ID = 10458941;

const algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);

export interface SignedPaymentProof {
  txId: string;
  confirmedRound: number;
  sender: string;
  recipient: string;
  amount: number;
  assetId: number;
}

/**
 * [SECURITY NOTICE & NON-CUSTODIAL MODEL]
 * In production dApps, human users sign non-custodially via wallet extensions (Pera, Defly, @txnlab/use-wallet).
 * For autonomous AI agents & CLI automated testing pipelines, transactions are signed using disposable,
 * testnet-only delegate credentials loaded from environment variables.
 * 
 * Constructs, signs, and broadcasts a fresh on-chain Algorand USDC ASA transfer transaction
 * (ASA ID: 10458941) to satisfy the x402 402 challenge, broadcasting it to Algorand Testnet.
 */
export async function signAndBroadcastPayment(
  recipientAddress: string,
  microAmount: number = 0,
  customMnemonic?: string,
  noteStr?: string,
  assetId: number = DEFAULT_USDC_ASA_ID
): Promise<SignedPaymentProof> {
  const mnemonic = customMnemonic || process.env.DEPLOYER_MNEMONIC || process.env.AVM_MNEMONIC;
  if (!mnemonic) {
    throw new Error('Missing client wallet mnemonic: DEPLOYER_MNEMONIC or AVM_MNEMONIC required.');
  }

  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const senderAddr = account.addr.toString();
  const params = await algodClient.getTransactionParams().do();

  const note = new TextEncoder().encode(noteStr || `x402-usdc-proof-${Date.now()}`);

  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    sender: senderAddr,
    receiver: recipientAddress,
    assetIndex: assetId,
    amount: microAmount,
    note,
    suggestedParams: params,
  });

  const txId = txn.txID();
  const signedTxn = txn.signTxn(account.sk);
  await algodClient.sendRawTransaction(signedTxn).do();

  // Wait for confirmation on Algorand Testnet (~3.2s)
  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
  const confirmedRound = Number(confirmedTxn.confirmedRound || 0);

  return {
    txId,
    confirmedRound,
    sender: senderAddr,
    recipient: recipientAddress,
    amount: microAmount,
    assetId,
  };
}
