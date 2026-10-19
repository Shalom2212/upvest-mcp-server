"""
Example MCP client using Google Gemini and FastMCP.
Connects to the local Upvest MCP server over stdio and issues trading simulation queries.
"""

import asyncio
import os
import sys
from pathlib import Path
from google import genai
from fastmcp import Client

# Resolve path to the compiled MCP server entrypoint
PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SERVER_PATH = PROJECT_ROOT / "dist" / "index.js"
SERVER_PATH = os.environ.get("UPVEST_MCP_PATH", str(DEFAULT_SERVER_PATH))

if not Path(SERVER_PATH).exists():
    print(
        f"[Warning] Built server not found at '{SERVER_PATH}'. "
        "Please run 'npm run build' in the root directory first.",
        file=sys.stderr,
    )

mcp_client = Client(SERVER_PATH)
gemini_client = genai.Client()

async def main():
    async with mcp_client:
        response = await gemini_client.aio.models.generate_content(
            model="gemini-2.5-flash",
            contents="Simulate an Upvest buy order for 10 shares of US0378331005 with 2000 EUR cash.",
            config=genai.types.GenerateContentConfig(
                tools=[mcp_client.session]
            ),
        )
        print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
