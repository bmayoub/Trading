import postgres from "postgres";

const DEFAULT_DB_TIMEOUT_MS = 8000;

function normalizeConnectionString(connectionString: string) {
  try {
    new URL(connectionString);
    return connectionString;
  } catch {
    const match = connectionString.match(/^(postgres(?:ql)?:\/\/)([^:]+):([^@]+)@(.+)$/i);
    if (!match) {
      return connectionString;
    }

    const [, prefix, user, password, suffix] = match;
    return `${prefix}${user}:${encodeURIComponent(password)}@${suffix}`;
  }
}

const connectionString = process.env.DATABASE_URL;
const normalizedConnectionString = connectionString ? normalizeConnectionString(connectionString) : null;

export const sql = normalizedConnectionString
  ? postgres(normalizedConnectionString, {
      ssl: "require",
      max: 4,
      connect_timeout: 5,
      idle_timeout: 5,
      max_lifetime: 60 * 5,
      prepare: false
    })
  : null;

export function ensureDb() {
  if (!sql) {
    throw new Error("DATABASE_URL is missing. Add it to your environment variables.");
  }

  return sql;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Database operation timed out after ${timeoutMs}ms (${label}).`));
        }, timeoutMs);
      })
    ]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export async function withDbFallback<T>(
  operation: (db: NonNullable<typeof sql>) => Promise<T>,
  fallback: T,
  options?: { timeoutMs?: number; label?: string }
): Promise<T> {
  if (!sql) {
    return fallback;
  }

  try {
    return await withTimeout(
      operation(sql),
      options?.timeoutMs ?? DEFAULT_DB_TIMEOUT_MS,
      options?.label ?? "unnamed-query"
    );
  } catch (error) {
    console.error("Database operation failed", error);
    return fallback;
  }
}
