import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Helper functions for interacting with Cloudflare services via MCP
 */

interface McpResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function callMcpTool(toolName: string, input: Record<string, unknown> = {}): Promise<McpResponse> {
  try {
    const inputJson = JSON.stringify(input);
    const command = `manus-mcp-cli tool call ${toolName} --server cloudflare --input '${inputJson.replace(/'/g, "'\\''")}'`;
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes("Tool call completed")) {
      console.error(`MCP tool ${toolName} stderr:`, stderr);
    }
    
    // Parse the output - MCP CLI returns JSON
    const output = stdout.trim();
    const lines = output.split('\n');
    const jsonLine = lines.find(line => line.trim().startsWith('{'));
    
    if (jsonLine) {
      const result = JSON.parse(jsonLine);
      return { success: true, data: result };
    }
    
    return { success: true, data: output };
  } catch (error) {
    console.error(`Error calling MCP tool ${toolName}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// D1 Database operations
export async function listD1Databases() {
  return callMcpTool("d1_databases_list");
}

export async function createD1Database(name: string) {
  return callMcpTool("d1_database_create", { name });
}

export async function queryD1Database(databaseId: string, sql: string, params?: unknown[]) {
  return callMcpTool("d1_database_query", { database_id: databaseId, sql, params });
}

export async function deleteD1Database(databaseId: string) {
  return callMcpTool("d1_database_delete", { database_id: databaseId });
}

// R2 Storage operations
export async function listR2Buckets() {
  return callMcpTool("r2_buckets_list");
}

export async function createR2Bucket(name: string) {
  return callMcpTool("r2_bucket_create", { name });
}

export async function getR2Bucket(name: string) {
  return callMcpTool("r2_bucket_get", { name });
}

export async function deleteR2Bucket(name: string) {
  return callMcpTool("r2_bucket_delete", { name });
}

// KV Namespace operations
export async function listKvNamespaces() {
  return callMcpTool("kv_namespaces_list");
}

export async function createKvNamespace(title: string) {
  return callMcpTool("kv_namespace_create", { title });
}

export async function getKvNamespace(namespaceId: string) {
  return callMcpTool("kv_namespace_get", { namespace_id: namespaceId });
}

export async function deleteKvNamespace(namespaceId: string) {
  return callMcpTool("kv_namespace_delete", { namespace_id: namespaceId });
}

// Account operations
export async function listAccounts() {
  return callMcpTool("accounts_list");
}

export async function setActiveAccount(accountId: string) {
  return callMcpTool("set_active_account", { activeAccountIdParam: accountId });
}

// Workers operations
export async function listWorkers() {
  return callMcpTool("workers_list");
}

export async function getWorker(scriptName: string) {
  return callMcpTool("workers_get_worker", { scriptName });
}
