/**
 * Worker thread for sqlite3 query execution.
 *
 * This isolates potentially long-running queries so they can be
 * terminated if they exceed the timeout.
 */

import { parentPort, workerData } from "node:worker_threads";
import Database from "better-sqlite3";

export interface WorkerInput {
  dbBuffer: Uint8Array | null; // null for :memory:
  sql: string;
  options: {
    bail: boolean;
    echo: boolean;
  };
}

export interface WorkerSuccess {
  success: true;
  results: StatementResult[];
  hasModifications: boolean;
  dbBuffer: Uint8Array | null; // serialized db if modified
}

export interface StatementResult {
  type: "data" | "error";
  columns?: string[];
  rows?: unknown[][];
  error?: string;
}

export interface WorkerError {
  success: false;
  error: string;
}

export type WorkerOutput = WorkerSuccess | WorkerError;

function isWriteStatement(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();
  return (
    trimmed.startsWith("INSERT") ||
    trimmed.startsWith("UPDATE") ||
    trimmed.startsWith("DELETE") ||
    trimmed.startsWith("CREATE") ||
    trimmed.startsWith("DROP") ||
    trimmed.startsWith("ALTER") ||
    trimmed.startsWith("REPLACE")
  );
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let inString = false;
  let stringChar = "";

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];

    if (inString) {
      current += char;
      if (char === stringChar) {
        if (sql[i + 1] === stringChar) {
          current += sql[++i];
        } else {
          inString = false;
        }
      }
    } else if (char === "'" || char === '"') {
      current += char;
      inString = true;
      stringChar = char;
    } else if (char === ";") {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = "";
    } else {
      current += char;
    }
  }

  const stmt = current.trim();
  if (stmt) statements.push(stmt);

  return statements;
}

function executeQuery(data: WorkerInput): WorkerOutput {
  let db: Database.Database;

  try {
    if (data.dbBuffer) {
      db = new Database(Buffer.from(data.dbBuffer));
    } else {
      db = new Database(":memory:");
    }
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }

  const results: StatementResult[] = [];
  let hasModifications = false;

  try {
    const statements = splitStatements(data.sql);

    for (const stmt of statements) {
      try {
        if (isWriteStatement(stmt)) {
          db.exec(stmt);
          hasModifications = true;
          results.push({ type: "data", columns: [], rows: [] });
        } else {
          const prepared = db.prepare(stmt);
          const columnInfo = prepared.columns();
          const columns = columnInfo.map((c) => c.name);
          const rows = prepared.raw(true).all() as unknown[][];
          results.push({ type: "data", columns, rows });
        }
      } catch (e) {
        const error = (e as Error).message;
        results.push({ type: "error", error });
        if (data.options.bail) {
          break;
        }
      }
    }

    let resultBuffer: Uint8Array | null = null;
    if (hasModifications) {
      resultBuffer = db.serialize();
    }

    db.close();
    return { success: true, results, hasModifications, dbBuffer: resultBuffer };
  } catch (e) {
    db.close();
    return { success: false, error: (e as Error).message };
  }
}

// Execute when run as worker
if (parentPort && workerData) {
  const result = executeQuery(workerData as WorkerInput);
  parentPort.postMessage(result);
}
