import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeConnectionString(connectionString) {
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

loadEnvFile(path.resolve(process.cwd(), ".env.local"));
loadEnvFile(path.resolve(process.cwd(), ".env"));

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const sql = postgres(normalizeConnectionString(connectionString), {
  ssl: "require",
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  prepare: false
});

try {
  const [candles] = await sql`select count(*)::int as count from candles`;
  const [pairs] = await sql`select count(*)::int as count from pairs where is_active = true`;
  console.log(JSON.stringify({ ok: true, candles: candles?.count ?? 0, activePairs: pairs?.count ?? 0 }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 1 });
}