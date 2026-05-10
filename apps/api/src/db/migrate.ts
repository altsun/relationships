import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

(async () => {
  const sql = neon(process.env.DATABASE_URL!);
  const db  = drizzle(sql);
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migration complete");
  process.exit(0);
})();
