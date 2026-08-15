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
}
