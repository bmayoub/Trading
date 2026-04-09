import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

export const sql = connectionString
  ? postgres(connectionString, {
      ssl: "require",
      max: 1,
      connect_timeout: 15,
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

export async function withDbFallback<T>(operation: (db: NonNullable<typeof sql>) => Promise<T>, fallback: T): Promise<T> {
  if (!sql) {
    return fallback;
  }

  try {
    return await operation(sql);
  } catch (error) {
    console.error("Database operation failed", error);
    return fallback;
  }
}
