import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import crypto from "node:crypto";
import type { OrderSimulationResult, OrderSide, OrderType } from "../types.js";

// Regex for standard 12-character ISIN (ISO 6166: 2 letters, 9 alphanumeric, 1 check digit)
const ISIN_REGEX = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

export function registerOrderTools(server: McpServer) {
  server.tool(
    "upvest_simulate_order",
    "Validates and simulates an investment order against Upvest Investment API rules (ISIN check, limits, and cash buffer verification).",
    {
      account_id: z
        .string()
        .optional()
        .describe("Upvest account UUID (generates a sandbox account ID if omitted)"),
      isin: z
        .string()
        .describe("12-character alphanumeric security ISIN (e.g. US0378331005)"),
      side: z.enum(["BUY", "SELL"]).describe("Order side (BUY or SELL)"),
      type: z.enum(["MARKET", "LIMIT"]).describe("Order execution type (MARKET or LIMIT)"),
      quantity: z
        .number()
        .positive()
        .describe("Unit share quantity (fractional allowed for MARKET, integer only for LIMIT)"),
      limit_price: z
        .number()
        .positive()
        .optional()
        .describe("Limit price per share in EUR (mandatory for LIMIT orders)"),
      available_cash: z
        .number()
        .min(0)
        .describe("Account available cash balance in EUR"),
    },
    async ({
      account_id,
      isin,
      side,
      type,
      quantity,
      limit_price,
      available_cash,
    }) => {
      const resolvedAccountId = account_id ?? `acc_${crypto.randomUUID().slice(0, 8)}`;
      const cleanIsin = isin.trim().toUpperCase();

      // 1. ISIN format validation (ISO 6166)
      if (!ISIN_REGEX.test(cleanIsin)) {
        return {
          content: [
            {
              type: "text",
              text: `Validation Error: Invalid ISIN format '${cleanIsin}'. Must be a 2-letter country code followed by 9 alphanumeric characters and 1 numeric check digit (e.g., US0378331005).`,
            },
          ],
          isError: true,
        };
      }

      // 2. Limit order constraints: whole shares only & limit_price required
      if (type === "LIMIT") {
        if (!Number.isInteger(quantity)) {
          return {
            content: [
              {
                type: "text",
                text: `Upvest Rule Violation: Limit orders must specify whole share units. Fractional quantities (${quantity}) are only accepted for MARKET orders.`,
              },
            ],
            isError: true,
          };
        }

        if (limit_price === undefined || limit_price <= 0) {
          return {
            content: [
              {
                type: "text",
                text: "Validation Error: 'limit_price' is mandatory for LIMIT orders and must be greater than 0.",
              },
            ],
            isError: true,
          };
        }
      }

      // 3. Price resolution and cash buffer check
      // For market orders without a limit price, simulate using a realistic reference price
      const referencePrice = limit_price ?? 150.0;
      const totalCost = quantity * referencePrice;

      // Upvest enforces a 10% cash buffer on MARKET BUY orders to absorb intraday volatility
      const requiredBuffer = side === "BUY" && type === "MARKET" ? totalCost * 0.1 : 0;
      const totalRequiredCash = totalCost + requiredBuffer;

      if (side === "BUY" && available_cash < totalRequiredCash) {
        const shortfall = totalRequiredCash - available_cash;
        return {
          content: [
            {
              type: "text",
              text:
                `Rejection: Insufficient funds. ` +
                `Order cost: €${totalCost.toFixed(2)}, ` +
                `Mandatory 10% market buffer: €${requiredBuffer.toFixed(2)}, ` +
                `Total required cash: €${totalRequiredCash.toFixed(2)}. ` +
                `Available cash: €${available_cash.toFixed(2)} (Shortfall: €${shortfall.toFixed(2)}).`,
            },
          ],
          isError: true,
        };
      }

      const result: OrderSimulationResult = {
        status: "VALIDATED_AND_ROUTED",
        order_id: crypto.randomUUID(),
        account_id: resolvedAccountId,
        isin: cleanIsin,
        side: side as OrderSide,
        type: type as OrderType,
        quantity,
        reference_price_eur: Number(referencePrice.toFixed(2)),
        estimated_cost_eur: Number(totalCost.toFixed(2)),
        cash_buffer_eur: Number(requiredBuffer.toFixed(2)),
        total_required_cash_eur: Number(totalRequiredCash.toFixed(2)),
        lifecycle: ["NEW", "PROCESSING", "SUBMITTED_TO_VENUE"],
        validation_details:
          "Passed ISIN format check, order type share divisibility, and Upvest cash reserve constraints.",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
