# upvest-mcp-server

A Model Context Protocol (MCP) server for the **Upvest Investment API**. It enables LLMs (such as Claude Desktop, Cursor, and Google Gemini) to simulate investment orders, generate RFC 9421-compliant HTTP Message Signatures, and triage webhook delivery anomalies and API rejection codes.

---

## Features

- **Order Simulation & Validation (`upvest_simulate_order`)**
  - Validates 12-character security ISIN formats (ISO 6166).
  - Enforces Upvest trading constraints: fractional orders are restricted to `MARKET` execution, while `LIMIT` orders require whole integer units.
  - Calculates mandatory 10% cash buffer reserves on `MARKET BUY` orders to cover intraday price volatility before routing to the clearing venue.
  - Simulates order lifecycle transitions (`NEW` &rarr; `PROCESSING` &rarr; `SUBMITTED_TO_VENUE`).

- **HTTP Message Signatures (`upvest_signature_generator`)**
  - Generates RFC 9421 / draft-ietf compliant `Signature-Input`, `Signature`, and `Digest` headers required by the Upvest API gateway.
  - Handles canonical `@method`, `@path`, and SHA-256 body digest hashing with cryptographic nonces and timestamps.

- **Webhook Anomaly & Failure Triage (`upvest_anomaly_analyzer`)**
  - Triages webhook delivery anomalies and execution failure codes (e.g. `INSUFFICIENT_FUNDS_BUFFER`, `INVALID_SIGNATURE`, `OUT_OF_ORDER_WEBHOOK`, `RATE_LIMIT_EXCEEDED`).
  - Provides root-cause analysis, severity ratings, and actionable fixes.

---

## Project Structure

```text
upvest-mcp-server/
├── src/
│   ├── index.ts                  # MCP server entrypoint & stdio transport
│   ├── types.ts                  # Domain interfaces & type definitions
│   └── tools/
│       ├── simulateOrder.ts      # upvest_simulate_order tool
│       ├── signatureGenerator.ts # upvest_signature_generator tool
│       └── anomalyAnalyzer.ts    # upvest_anomaly_analyzer tool
├── dist/                         # Compiled JavaScript distribution
├── client/
│   ├── gemini.py                 # FastMCP + Gemini client example
│   └── requirements.txt          # Python client requirements
├── package.json
└── tsconfig.json
```

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation & Build

```bash
# Clone the repository
git clone https://github.com/Shalom2212/upvest-mcp-server.git
cd upvest-mcp-server

# Install dependencies
npm install

# Build the TypeScript project
npm run build
```

### Running Locally

```bash
# Start in production mode
npm start

# Run in development mode with hot reload
npm run dev
```

---

## Client Configuration

### Claude Desktop

Add the server to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "upvest": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/upvest-mcp-server/dist/index.js"]
    }
  }
}
```

### Cursor

Add to your project's `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "upvest": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

### Python / Gemini Client

The repo includes a Python client in `client/gemini.py` demonstrating how to connect to the MCP server using `fastmcp` and Google's Gemini SDK:

```bash
# Install Python dependencies
pip install -r client/requirements.txt

# Set your Gemini API key
export GEMINI_API_KEY="your-api-key"

# Run the client
python client/gemini.py
```

---

## Available MCP Tools

### 1. `upvest_simulate_order`

Simulates an investment order against Upvest trading and risk rules.

| Argument | Type | Required | Description |
|---|---|---|---|
| `isin` | `string` | **Yes** | 12-character alphanumeric security ISIN (e.g. `US0378331005`) |
| `side` | `"BUY" \| "SELL"` | **Yes** | Order side |
| `type` | `"MARKET" \| "LIMIT"` | **Yes** | Execution type |
| `quantity` | `number` | **Yes** | Number of shares (fractional allowed for `MARKET`) |
| `available_cash` | `number` | **Yes** | Account available cash balance in EUR |
| `limit_price` | `number` | Optional | Limit price per share in EUR (mandatory for `LIMIT` orders) |
| `account_id` | `string` | Optional | Upvest account UUID (generates sandbox account if omitted) |

### 2. `upvest_signature_generator`

Generates RFC 9421 HTTP Message Signature headers.

| Argument | Type | Required | Description |
|---|---|---|---|
| `method` | `"GET" \| "POST" \| "PUT" \| "PATCH" \| "DELETE"` | **Yes** | HTTP request method |
| `path` | `string` | **Yes** | Request path and query string (e.g. `/orders`) |
| `payload` | `string` | Optional | JSON stringified request body |
| `key_id` | `string` | Optional | Upvest API Key ID |

### 3. `upvest_anomaly_analyzer`

Diagnoses Upvest webhook failures and error states.

| Argument | Type | Required | Description |
|---|---|---|---|
| `event_type` | `string` | **Yes** | Webhook event name (e.g. `order.cancelled`) |
| `error_code` | `string` | **Yes** | Upvest error identifier (e.g. `INSUFFICIENT_FUNDS_BUFFER`) |
| `payload_diff` | `string` | Optional | Raw payload or error message snippet |

---

## License

This project is licensed under the [MIT License](LICENSE).
