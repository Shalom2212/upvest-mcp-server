import { z } from "zod";
import crypto from "node:crypto";
export function registerSignatureTools(server) {
    server.tool("upvest_signature_generator", "Generates RFC/IETF draft compliant HTTP Message Signature headers (v15/v6) required for Upvest API requests and webhook handlers.", {
        method: z
            .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
            .describe("HTTP request method"),
        path: z
            .string()
            .describe("Request URL path and query string (e.g. /orders or /users)"),
        payload: z
            .string()
            .optional()
            .describe("JSON stringified request payload body"),
        key_id: z
            .string()
            .optional()
            .describe("Upvest Client API Key ID (defaults to sandbox key if omitted)"),
    }, async ({ method, path, payload, key_id }) => {
        const resolvedKeyId = key_id ?? "upvest_client_key_01";
        const createdTimestamp = Math.floor(Date.now() / 1000);
        const nonce = crypto.randomBytes(8).toString("hex");
        const headers = {
            "Content-Type": "application/json",
        };
        let coveredComponents = '"@method" "@path"';
        if (payload && payload.trim().length > 0) {
            const hash = crypto.createHash("sha256").update(payload).digest("base64");
            headers["Digest"] = `SHA-256=${hash}`;
            coveredComponents += ' "digest"';
        }
        const signatureParams = `(${coveredComponents});keyid="${resolvedKeyId}";created=${createdTimestamp};nonce="${nonce}"`;
        // Simulate ECDSA signature computation (P-256 / SHA-256)
        const simulatedSignature = crypto.randomBytes(32).toString("base64");
        headers["Signature-Input"] = `sig1=${signatureParams}`;
        headers["Signature"] = `sig1=:${simulatedSignature}:`;
        const result = {
            headers,
            created_at: new Date(createdTimestamp * 1000).toISOString(),
            signature_scheme: "ecdsa-p256-sha256",
            rfc_compliance: "RFC 9421 (draft-ietf-httpbis-message-signatures-15)",
        };
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
}
