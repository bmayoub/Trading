import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

export const sql = connectionString
  ? postgres(connectionString, { ssl: "require", max: 1 })
  : null;

export function ensureDb() {
  if (!sql) {
    throw new Error("DATABASE_URL is missing. Add it to your environment variables.");
  }

  return sql;
}
