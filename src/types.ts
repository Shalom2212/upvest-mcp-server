export type OrderSide = "BUY" | "SELL";
export type OrderType = "MARKET" | "LIMIT";

export interface OrderSimulationResult {
  status: "VALIDATED_AND_ROUTED" | "REJECTED";
  order_id: string;
  account_id: string;
  isin: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  reference_price_eur: number;
  estimated_cost_eur: number;
  cash_buffer_eur: number;
  total_required_cash_eur: number;
  lifecycle: string[];
  validation_details: string;
}

export interface SignatureHeadersResult {
  headers: Record<string, string>;
  created_at: string;
  signature_scheme: string;
  rfc_compliance: string;
}

export interface AnomalyTriageResult {
  event: string;
  error_code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  root_cause: string;
  recommended_fix: string;
  documentation_url?: string;
  context_received?: string;
}
