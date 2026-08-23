import React from 'react';

export const PaymentsTab: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col gap-6">
      {/* Header */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-[22px] font-bold text-charcoal">x402 &amp; GoPlausible Facilitator Protocol</h2>
            <p className="text-[13px] text-text-muted mt-0.5">
              Standardized HTTP 402 payment challenge, client-side signing, and gasless facilitator atomic group settlement on Algorand.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-charcoal bg-lime-accent px-3 py-1 rounded-full shadow-xs">
              CAIP-2 AVM Scheme
            </span>
          </div>
        </div>
      </div>

      {/* Protocol Architecture Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Step 1: 402 Challenge Card (Span 6) */}
        <div className="lg:col-span-6 bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-charcoal flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-charcoal text-lime-accent flex items-center justify-center text-[12px]">
                1
              </span>
              <span>HTTP 402 Payment Required Challenge</span>
            </h3>
            <span className="text-[11px] font-mono font-bold bg-error-container/40 text-error px-2 py-0.5 rounded-full">
              402 Status
            </span>
          </div>
          <p className="text-[12px] text-text-muted">
            When an autonomous AI agent sends a request without proof, SLAShield issues a standard x402 challenge.
          </p>

          <div className="bg-[#1B1F19] text-[#E7E9ED] p-4 rounded-xl font-mono text-[11px] overflow-x-auto custom-scrollbar">
            <div className="text-[#86868B] mb-1">// HTTP Response Headers</div>
            <div className="text-lime-accent">HTTP/1.1 402 Payment Required</div>
            <div className="text-white">WWW-Authenticate: x402 realm="SLAShield402", amount="0.001", currency="USDC", network="algorand-testnet"</div>
            <div className="text-white">X-402-Version: 2</div>
            <div className="text-[#86868B] my-2">// JSON Challenge Body</div>
            <div className="text-[#B1EC49]">{`{`}</div>
            <div className="pl-3 text-white">"x402Version": 2,</div>
            <div className="pl-3 text-white">"accepts": [{`{`}</div>
            <div className="pl-6 text-white">"scheme": "exact",</div>
            <div className="pl-6 text-white">"network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",</div>
            <div className="pl-6 text-white">"amount": "1000", <span className="text-[#86868B]">// 0.001 USDC (micro-units)</span></div>
            <div className="pl-6 text-white">"asset": "10458941", <span className="text-[#86868B]">// Circle USDC Testnet ASA</span></div>
            <div className="pl-6 text-white">"payTo": "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ",</div>
            <div className="pl-6 text-white">"extra": {`{ "feePayer": "ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA" }`}</div>
            <div className="pl-3 text-white">{`}]`}</div>
            <div className="text-[#B1EC49]">{`}`}</div>
          </div>
        </div>

        {/* Step 2: GoPlausible Facilitator Settlement Card (Span 6) */}
        <div className="lg:col-span-6 bg-app-surface border border-border-light rounded-card p-5 shadow-premium flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-charcoal flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-lime-accent text-charcoal flex items-center justify-center text-[12px] font-bold">
                2
              </span>
              <span>GoPlausible Facilitator Atomic Settlement</span>
            </h3>
            <span className="text-[11px] font-mono font-bold bg-primary-container/30 text-primary px-2 py-0.5 rounded-full">
              Gasless Relay
            </span>
          </div>
          <p className="text-[12px] text-text-muted">
            The client constructs an unbroadcasted 2-txn group. GoPlausible verifies and co-signs Tx 0 as the gas fee-payer.
          </p>

          <div className="bg-[#1B1F19] text-[#E7E9ED] p-4 rounded-xl font-mono text-[11px] overflow-x-auto custom-scrollbar">
            <div className="text-[#86868B] mb-1">// Facilitator /verify &amp; /settle Flow</div>
            <div className="text-lime-accent">POST https://facilitator.goplausible.xyz/verify</div>
            <div className="text-[#86868B]">// Verification Result:</div>
            <div className="text-white">{`{ "isValid": true, "payer": "YVEHNV3E...AZSOKQ" }`}</div>
            <div className="text-lime-accent mt-2">POST https://facilitator.goplausible.xyz/settle</div>
            <div className="text-[#86868B]">// Co-Signed On-Chain Broadcast:</div>
            <div className="text-[#B1EC49]">{`{`}</div>
            <div className="pl-3 text-white">"success": true,</div>
            <div className="pl-3 text-white">"transaction": "VBC6WVDSRFRLMFL7RD3Q7L7I3A3FHXTKCYWPZJAIO2SHYPC5V2VA",</div>
            <div className="pl-3 text-white">"network": "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",</div>
            <div className="pl-3 text-white">"payer": "YVEHNV3EWF4GULZHABH64QKOYLE5MO2MSBAAK7O76A2ESACA5OV2AZSOKQ"</div>
            <div className="text-[#B1EC49]">{`}`}</div>
          </div>
        </div>
      </div>

      {/* Live Verified Facilitator Transaction Showcase */}
      <div className="bg-app-surface border border-border-light rounded-card p-6 shadow-premium flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-[16px] font-bold text-charcoal">Live On-Chain Facilitator Proof</h3>
            <p className="text-[12px] text-text-muted">Confirmed on Algorand Testnet with GoPlausible Facilitator co-signing</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://lora.algokit.io/testnet/transaction/VBC6WVDSRFRLMFL7RD3Q7L7I3A3FHXTKCYWPZJAIO2SHYPC5V2VA"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-charcoal text-white hover:bg-black text-[12px] font-semibold rounded-full flex items-center gap-1.5 transition-colors"
            >
              <span>Inspect on Lora</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
            <a
              href="https://testnet.explorer.perawallet.app/tx/VBC6WVDSRFRLMFL7RD3Q7L7I3A3FHXTKCYWPZJAIO2SHYPC5V2VA/"
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-1.5 bg-secondary-surface text-charcoal hover:bg-border-light/50 border border-border-light text-[12px] font-semibold rounded-full flex items-center gap-1.5 transition-colors"
            >
              <span>Inspect on Pera</span>
              <span className="material-symbols-outlined text-[14px]">open_in_new</span>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
          <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
            <span className="text-text-muted text-[11px]">Transaction ID</span>
            <div className="font-mono font-bold text-charcoal mt-0.5 truncate">
              VBC6WVDSRFRLMFL7RD3Q7L7I3A3FHXTKCYWPZJAIO2SHYPC5V2VA
            </div>
          </div>
          <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
            <span className="text-text-muted text-[11px]">USDC Transferred</span>
            <div className="font-mono font-bold text-charcoal mt-0.5">
              1,000 micro-units (0.001 USDC)
            </div>
          </div>
          <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
            <span className="text-text-muted text-[11px]">Confirmed Round</span>
            <div className="font-mono font-bold text-primary mt-0.5">
              Round 66582509
            </div>
          </div>
          <div className="p-3 bg-secondary-surface rounded-xl border border-border-light">
            <span className="text-text-muted text-[11px]">Facilitator Fee Payer</span>
            <div className="font-mono font-bold text-charcoal mt-0.5 truncate">
              ZMFK2OI7ZBD2U27ISERZC4S6LKM6WMFJPZQ4MYNJDZ2VNBNMBA67RA22AA
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
