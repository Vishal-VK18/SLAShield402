import React from 'react';
import { ExternalLink, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

export const TransactionProofPanel: React.FC = () => {
  const proofs = [
    {
      title: 'Settlement Payout (PASS)',
      state: 'LOCKED ➔ APPROVED ➔ SETTLED',
      detail: '0.02 ALGO Inner Payment',
      txId: '6ZW7QBK2PVHM3GTZPJLBYDINU2VINPCTOSRPPJZRMBMYICXSBJ3Q',
      url: 'https://testnet.explorer.perawallet.app/tx/6ZW7QBK2PVHM3GTZPJLBYDINU2VINPCTOSRPPJZRMBMYICXSBJ3Q/',
      tag: 'Confirmed',
      icon: CheckCircle2,
    },
    {
      title: 'Refund & Bond Slash (FAIL)',
      state: 'LOCKED ➔ SLA_FAILED ➔ REFUNDED',
      detail: '0.02 ALGO Refund + 10% Slash',
      txId: 'KDAMSD7AFQ7GFUT2D4PBG4M3DW4QW3YJDSEBI5PI2V45MYLUJX5A',
      url: 'https://testnet.explorer.perawallet.app/tx/KDAMSD7AFQ7GFUT2D4PBG4M3DW4QW3YJDSEBI5PI2V45MYLUJX5A/',
      tag: 'Slashed',
      icon: ShieldAlert,
    },
    {
      title: 'Provider Bond Stake',
      state: 'STAKED 10 USDC/ALGO',
      detail: '10,000,000 micro-units',
      txId: 'RPZFMYQTZ2RKWPTXNGQP53DWJ4ATX5H5MHGCWSFATQU4NCEG65FQ',
      url: 'https://testnet.explorer.perawallet.app/tx/RPZFMYQTZ2RKWPTXNGQP53DWJ4ATX5H5MHGCWSFATQU4NCEG65FQ/',
      tag: 'Confirmed',
      icon: CheckCircle2,
    },
    {
      title: 'Smart Contract Deployment',
      state: 'App #769236555 Created',
      detail: 'PyTeal v8 Bytecode',
      txId: 'IKEQATEBSHETIEHTUKVG33PIUEY7BZY2Q5RY6NLSIA252AFSIBJQ',
      url: 'https://testnet.explorer.perawallet.app/tx/IKEQATEBSHETIEHTUKVG33PIUEY7BZY2Q5RY6NLSIA252AFSIBJQ/',
      tag: 'Deployed',
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="glass-panel rounded-2xl p-5">
      <div className="flex items-center justify-between pb-3 border-b border-black/5 mb-4">
        <h3 className="font-semibold text-sm tracking-tight text-[#1D1D1F]">
          Verified On-Chain Records (Algorand Testnet)
        </h3>
        <span className="text-[11px] font-mono text-[#86868B]">
          App ID 769236555
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {proofs.map((p) => {
          const Icon = p.icon;
          return (
            <a
              key={p.txId}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="glass-card rounded-xl p-3.5 flex items-start justify-between gap-3 group hover:bg-white/80 transition-all border border-black/5"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-[#1D1D1F] tracking-tight">
                    {p.title}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/5 text-[#86868B]">
                    {p.tag}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-[#86868B] mt-0.5">
                  {p.state}
                </div>
                <div className="text-[10.5px] font-mono text-[#1D1D1F] mt-1 truncate">
                  Tx: {p.txId.substring(0, 16)}...
                </div>
              </div>

              <div className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center text-[#86868B] group-hover:text-black group-hover:bg-black/10 transition-colors shrink-0 mt-0.5">
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
};
