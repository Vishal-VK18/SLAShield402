import React from 'react';
import { motion } from 'framer-motion';
import { DashboardStats } from '../types.js';

interface StatsStripProps {
  stats: DashboardStats;
}

export const StatsStrip: React.FC<StatsStripProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Requests',
      value: stats.totalRequests.toLocaleString(),
      sub: 'x402 evaluations handled',
    },
    {
      label: 'Firewall Approvals',
      value: stats.approvedCount.toLocaleString(),
      sub: `${stats.blockedCount} anomalies blocked`,
    },
    {
      label: 'Settled Payouts',
      value: `$${stats.settledAmountUsdc.toFixed(3)}`,
      sub: 'Verified SLA outcomes',
    },
    {
      label: 'Refunds & Penalties',
      value: `$${stats.refundedAmountUsdc.toFixed(3)}`,
      sub: 'Agent refunds + bond slashes',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 200,
            delay: i * 0.04,
          }}
          className="glass-card rounded-2xl p-4 flex flex-col justify-between"
        >
          <span className="text-[11.5px] font-medium text-[#86868B] tracking-tight uppercase">
            {c.label}
          </span>
          <div className="my-1.5">
            <span className="stat-value font-semibold text-2xl md:text-3xl text-[#1D1D1F] tabular-nums tracking-[-0.03em]">
              {c.value}
            </span>
          </div>
          <span className="text-[11.5px] text-[#86868B] font-normal leading-tight">
            {c.sub}
          </span>
        </motion.div>
      ))}
    </div>
  );
};
