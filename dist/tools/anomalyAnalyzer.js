import { z } from "zod";
const UPVEST_ANOMALY_KNOWLEDGE_BASE = {
    INSUFFICIENT_FUNDS_BUFFER: {
        severity: "MEDIUM",
        root_cause: "Upvest rejects market buy orders when account cash cannot cover the mandatory 10% intraday volatility buffer required before routing to the clearing broker.",
        recommended_fix: "Deposit additional funds or place a LIMIT order which does not require the 10% market buffer.",
        doc_url: "https://docs.upvest.co/guides/orders/cash-buffer",
    },
    INVALID_SIGNATURE: {
        severity: "HIGH",
        root_cause: "Mismatch in canonical HTTP Message Signature parameters. Common causes include altered header casing, payload mutation after digest computation, or timestamp skew exceeding ±300 seconds.",
        recommended_fix: "Verify that @method and @path match the outgoing request exactly, keep the raw body unmodified after hashing, and sync server clock via NTP.",
        doc_url: "https://docs.upvest.co/guides/authentication/http-signatures",
    },
    OUT_OF_ORDER_WEBHOOK: {
        severity: "LOW",
        root_cause: "Upvest delivers webhooks asynchronously across multiple workers without strict arrival sequencing guarantees.",
        recommended_fix: "Sort events locally using the event 'created_at' timestamp or sequence number rather than arrival time. Ensure handler idempotency using event IDs.",
        doc_url: "https://docs.upvest.co/guides/webhooks/handling",
    },
    RATE_LIMIT_EXCEEDED: {
        severity: "MEDIUM",
        root_cause: "The client application has exceeded the maximum allowed request rate per minute for this endpoint.",
        recommended_fix: "Implement exponential backoff with jitter and respect the 'Retry-After' header returned in HTTP 429 responses.",
    },
    ACCOUNT_LOCKED: {
        severity: "HIGH",
        root_cause: "The trading account is suspended due to compliance, KYC review, or security lock.",
        recommended_fix: "Inspect account status via /users endpoint or reach out to Upvest compliance support.",
    },
};
export function registerAnomalyTools(server) {
    server.tool("upvest_anomaly_analyzer", "Auto-triages Upvest webhook delivery anomalies, out-of-order state transitions, and execution failure codes.", {
        event_type: z
            .string()
            .describe("Webhook event (e.g., order.cancelled, execution.rejected, webhook.failed)"),
        error_code: z
            .string()
            .describe("Upvest error identifier (e.g. INSUFFICIENT_FUNDS_BUFFER, INVALID_SIGNATURE)"),
        payload_diff: z
            .string()
            .optional()
            .describe("Optional raw error message or JSON payload for additional triage context"),
    }, async ({ event_type, error_code, payload_diff }) => {
        const normalizedCode = error_code.trim().toUpperCase();
        const matched = UPVEST_ANOMALY_KNOWLEDGE_BASE[normalizedCode];
        const triage = {
            event: event_type,
            error_code: normalizedCode,
            severity: matched ? matched.severity : "MEDIUM",
            root_cause: matched?.root_cause ??
                `Unmapped error state '${error_code}'. Detected in webhook event '${event_type}'.`,
            recommended_fix: matched?.recommended_fix ??
                "Ensure local idempotency keys match and reconcile ledger entries against the /transactions endpoint.",
            documentation_url: matched?.doc_url,
            ...(payload_diff && { context_received: payload_diff }),
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(triage, null, 2),
                },
            ],
        };
    });
}
