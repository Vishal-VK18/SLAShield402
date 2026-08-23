export type ShieldEventType =
  | 'request_received'
  | 'challenge_issued'
  | 'payment_verified'
  | 'firewall_decision'
  | 'target_api_response'
  | 'sla_decision'
  | 'settlement_result';

export interface ShieldEvent {
  event: ShieldEventType;
  timestamp: string;
  data: any;
}

export interface DashboardStats {
  totalRequests: number;
  approvedCount: number;
  blockedCount: number;
  settledAmountUsdc: number;
  refundedAmountUsdc: number;
  slashedAmountUsdc: number;
}

export interface WalletInfo {
  address: string;
  algoBalance: number;
  usdcBalance: number;
  optedIn: boolean;
}

export interface WalletStatusResponse {
  primary: WalletInfo;
  secondary: WalletInfo | null;
  activeWalletMode: 'primary' | 'secondary';
  network: string;
  usdcAssetId: string | number;
  appId: number;
}

export type ActiveTab = 'overview' | 'activity' | 'protection' | 'payments' | 'sla' | 'demo';

export interface DemoExecutionResult {
  scenario: number;
  name: string;
  status: 'SETTLED' | 'BLOCKED' | 'REFUNDED_AND_PENALIZED' | 'RUNNING' | 'ERROR';
  tx_id?: string;
  explorer_url?: string;
  payment_id?: string;
  amount?: number;
  slashed_bond?: number;
  reason?: string;
  error?: string;
}

export interface FirewallSimulationResult {
  approved: boolean;
  checks: {
    budget: boolean;
    price: boolean;
    provider: boolean;
  };
  reason?: string;
}
