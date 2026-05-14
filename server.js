import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { z } from "zod";

const app = express();
app.use(express.json());

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

async function callScript(tool, params = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, params }),
    redirect: "follow",
  });
  return await res.json();
}

function createMcpServer() {
  const server = new McpServer({
    name: "gdrive-apps-script-mcp",
    version: "1.0.0",
  });

  server.tool("list_shared_drives", "Lista todas las Unidades Compartidas de Google Drive", {},
    async () => {
      const data = await callScript("list_shared_drives");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("list_files", "Lista archivos y carpetas dentro de una carpeta de Drive",
    {
      folder_id: z.string().optional().describe("ID de la carpeta"),
      drive_id: z.string().optional().describe("ID de la Unidad Compartida"),
      search: z.string().optional().describe("Filtrar por nombre"),
    },
    async (params) => {
      const data = await callScript("list_files", params);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("read_file", "Lee el contenido completo de un archivo",
    { file_id: z.string().describe("ID del archivo a leer") },
    async (params) => {
      const data = await callScript("read_file", params);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool("search_files", "Busca archivos por nombre en todo el Drive",
    { query: z.string().describe("Nombre o parte del nombre a buscar") },
    async (params) => {
      const data = await callScript("search_files", params);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  return server;
}

app.all("/mcp", async (req, res) => {
  const server = createMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "gdrive-apps-script-mcp" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MCP Server en http://localhost:${PORT}/mcp`);
});
