import algosdk from 'algosdk';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { x402Client } from '@x402/core/client';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import { ALGORAND_TESTNET_CAIP2 } from '@x402/avm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../person-3-algorand-contract/.env') });

const ALGOD_SERVER = process.env.ALGOD_SERVER || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;
const ALGOD_TOKEN = '';
const DEFAULT_USDC_ASA_ID = 10458941;
const FULL_TESTNET_CAIP2 = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';

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
 * Constructs a standard x402 Payment Payload (base64 signed transaction group)
 * ready to be submitted to GoPlausible Facilitator for /verify and /settle.
 */
export async function createSignedPaymentPayload(
  paymentRequiredChallenge: any,
  customMnemonic?: string
): Promise<any> {
  const challenge = {
    x402Version: 2,
    ...paymentRequiredChallenge,
  };

  const mnemonic = customMnemonic || process.env.DEPLOYER_MNEMONIC || process.env.AVM_MNEMONIC;
  if (!mnemonic) {
    throw new Error('Missing client wallet mnemonic: DEPLOYER_MNEMONIC or AVM_MNEMONIC required.');
  }

  const account = algosdk.mnemonicToSecretKey(mnemonic);
  const senderAddr = account.addr.toString();

  const clientSigner = {
    address: senderAddr,
    signTransactions: async (txns: Uint8Array[], indexesToSign?: number[]) => {
      return txns.map((txnBytes, i) => {
        if (indexesToSign && !indexesToSign.includes(i)) return null;
        const decoded = algosdk.decodeUnsignedTransaction(txnBytes);
        return algosdk.signTransaction(decoded, account.sk).blob;
      });
    }
  };

  const client = new x402Client()
    .register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(clientSigner))
    .register(FULL_TESTNET_CAIP2, new ExactAvmScheme(clientSigner));

  return await client.createPaymentPayload(challenge);
}

/**
 * Direct on-chain broadcast helper (used for standalone testnet validation).
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

  const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);
  const confirmedRound = Number(confirmedTxn['confirmed-round'] || 0);

  return {
    txId,
    confirmedRound,
    sender: senderAddr,
    recipient: recipientAddress,
    amount: microAmount,
    assetId,
  };
}
