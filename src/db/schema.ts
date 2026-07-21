import { sql } from "drizzle-orm";
import { int, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const block_users_table = sqliteTable("block_users", {
  id: int().primaryKey({ autoIncrement: true }),
  chat_id: integer("chat_id").unique(),
  username: text("username").unique(),
  created_at: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

export const share_tokens_table = sqliteTable("share_tokens", {
  id: int().primaryKey({ autoIncrement: true }),
  token: text("token").unique().notNull(),
  file_key: text("file_key").notNull(),
  expires_at: integer("expires_at", { mode: "timestamp" }).notNull(),
  created_by: text("created_by").notNull(),
  created_at: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});

export const folders_table = sqliteTable("folders", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  parent_id: integer("parent_id"),
  user_id: text("user_id").notNull(),
  created_at: integer("created_at", { mode: "timestamp" })
    .default(sql`(unixepoch())`)
    .notNull(),
});
