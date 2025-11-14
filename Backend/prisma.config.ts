import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: "postgresql://neondb_owner:npg_0Oc1APfjlSIU@ep-spring-moon-ahzf4izk-pooler.c-3.us-east-1.aws.neon.tech/chat?sslmode=require&channel_binding=require",
  },
});
