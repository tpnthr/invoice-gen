import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzleNode } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const parseBoolean = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
};

const isNeonHost = (url: string): boolean => {
  try {
    const { hostname } = new URL(url);
    return hostname.endsWith(".neon.tech") || hostname.endsWith(".neon.build");
  } catch (_err) {
    return false;
  }
};

const databaseUrl = process.env.DATABASE_URL;
const flag = parseBoolean(process.env.DATABASE_USE_NEON_WEBSOCKETS);
const useNeon = flag ?? isNeonHost(databaseUrl);

let poolInstance: NeonPool | PgPool;
let dbInstance:
  | ReturnType<typeof drizzleNeon>
  | ReturnType<typeof drizzleNode>;

if (useNeon) {
  neonConfig.webSocketConstructor = ws;
  const neonPool = new NeonPool({ connectionString: databaseUrl });
  poolInstance = neonPool;
  dbInstance = drizzleNeon({ client: neonPool, schema });
} else {
  const pgPool = new PgPool({ connectionString: databaseUrl });
  poolInstance = pgPool;
  dbInstance = drizzleNode(pgPool, { schema });
}

export const pool = poolInstance;
export const db = dbInstance;
export const isUsingNeon = useNeon;
