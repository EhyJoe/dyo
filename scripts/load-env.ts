/**
 * Minimal .env loader for standalone scripts (tsx/node).
 * Next.js loads .env/.env.local automatically, but plain scripts do not.
 * Loads in priority order: .env.local, .env. Does not override existing values.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnv(raw: string) {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export function loadEnv() {
  const root = process.cwd();
  for (const name of [".env.local", ".env"]) {
    try {
      const parsed = parseEnv(readFileSync(resolve(root, name), "utf8"));
      for (const [k, v] of Object.entries(parsed)) {
        if (!(k in process.env)) process.env[k] = v;
      }
    } catch {
      // file may not exist; ignore
    }
  }
}

loadEnv();