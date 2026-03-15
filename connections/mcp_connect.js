import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import McpWrapper from "../classes/McpWrapper.js"

const transport = new StdioClientTransport({
    command: "npx",
    args: ["mcp-remote", "https://mcp-server.zomato.com/mcp"]
});

const client = new Client(
  { name: "my-app", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

const wrappedClient = new McpWrapper(client);
export default wrappedClient;