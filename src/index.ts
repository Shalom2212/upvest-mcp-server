#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import process from "node:process";
import { registerOrderTools } from "./tools/simulateOrder.js";
import { registerSignatureTools } from "./tools/signatureGenerator.js";
import { registerAnomalyTools } from "./tools/anomalyAnalyzer.js";

// Initialize Upvest MCP Server
const server = new McpServer({
  name: "upvest-mcp-server",
  version: "1.0.0",
});

// Register tool modules
registerOrderTools(server);
registerSignatureTools(server);
registerAnomalyTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Upvest MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting Upvest MCP server:", error);
  process.exit(1);
});
