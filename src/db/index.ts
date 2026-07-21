import { eq, or, and, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/d1";
import { block_users_table, share_tokens_table, folders_table } from "./schema";

export async function is_user_banned(
  db: D1Database,
  chat_id?: number,
  username?: string,
) {
  const d1 = drizzle(db);

  const filters = [];
  if (chat_id) filters.push(eq(block_users_table.chat_id, chat_id));
  if (username) {
    filters.push(eq(block_users_table.username, username.toLowerCase()));
  }
  if (filters.length === 0) return false;

  const result = await d1
    .select()
    .from(block_users_table)
    .where(or(...filters))
    .limit(1);

  return result.length > 0;
}

// block user function
export async function block_user(
  db: D1Database,
  params: { chat_id?: number; username?: string },
) {
  const d1 = drizzle(db);
  const { chat_id, username } = params;

  if (!chat_id && !username) {
    throw new Error("\u0628\u0627\u06cc\u062f chat_id \u06cc\u0627 username \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f");
  }

  // upsert the block record
  return await d1
    .insert(block_users_table)
    .values({
      chat_id,
      username: username?.toLowerCase(),
    })
    .onConflictDoUpdate({
      target: block_users_table.chat_id,
      set: { username: username?.toLowerCase() },
    });
}

// unblock user function
export async function unblock_user(
  db: D1Database,
  identifier: string | number, // can be either chat_id (number) or username (string)
) {
  const d1 = drizzle(db);

  if (typeof identifier === "number") {
    return await d1
      .delete(block_users_table)
      .where(eq(block_users_table.chat_id, identifier));
  } else {
    return await d1
      .delete(block_users_table)
      .where(eq(block_users_table.username, identifier.toLowerCase()));
  }
}

// list blocked users function
export async function list_blocked_users(db: D1Database) {
  const d1 = drizzle(db);
  return await d1.select().from(block_users_table).all();
}

// ===== Share Tokens =====

export async function create_share_token(
  db: D1Database,
  params: { token: string; file_key: string; expires_at: Date; created_by: string },
) {
  const d1 = drizzle(db);
  return await d1.insert(share_tokens_table).values({
    token: params.token,
    file_key: params.file_key,
    expires_at: params.expires_at,
    created_by: params.created_by,
  });
}

export async function get_share_token(db: D1Database, token: string) {
  const d1 = drizzle(db);
  const now = new Date();
  const result = await d1
    .select()
    .from(share_tokens_table)
    .where(eq(share_tokens_table.token, token))
    .limit(1);
  if (result.length === 0) return null;
  const row = result[0];
  if (row.expires_at <= now) return null;
  return row;
}

export async function cleanup_expired_tokens(db: D1Database) {
  const d1 = drizzle(db);
  const now = new Date();
  await d1
    .delete(share_tokens_table)
    .where(lt(share_tokens_table.expires_at, now));
}

export async function list_user_share_tokens(db: D1Database, username: string) {
  const d1 = drizzle(db);
  return await d1
    .select()
    .from(share_tokens_table)
    .where(eq(share_tokens_table.created_by, username.toLowerCase()));
}

// ===== Folders =====

export async function get_user_folders(
  db: D1Database,
  userId: string,
  parentId: number | null,
) {
  const d1 = drizzle(db);
  if (parentId === null) {
    return await d1
      .select()
      .from(folders_table)
      .where(
        and(
          eq(folders_table.user_id, userId.toLowerCase()),
          sql`${folders_table.parent_id} IS NULL`,
        ),
      )
      .all();
  }
  return await d1
    .select()
    .from(folders_table)
    .where(
      and(
        eq(folders_table.user_id, userId.toLowerCase()),
        eq(folders_table.parent_id, parentId),
      ),
    )
    .all();
}

export async function create_folder(
  db: D1Database,
  params: { name: string; userId: string; parentId: number | null },
) {
  const d1 = drizzle(db);
  // Check if folder with same name exists in same location
  const existing = await d1
    .select()
    .from(folders_table)
    .where(
      and(
        eq(folders_table.user_id, params.userId.toLowerCase()),
        eq(folders_table.name, params.name),
        params.parentId === null
          ? sql`${folders_table.parent_id} IS NULL`
          : eq(folders_table.parent_id, params.parentId),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    throw new Error("\u0641\u0648\u0644\u062f\u0631\u06cc \u0628\u0627 \u0627\u06cc\u0646 \u0627\u0633\u0645 \u0642\u0628\u0644\u0627\u064c \u0648\u062c\u0648\u062f \u062f\u0627\u0631\u062f");
  }

  return await d1.insert(folders_table).values({
    name: params.name,
    user_id: params.userId.toLowerCase(),
    parent_id: params.parentId,
  });
}

export async function get_folder_by_name(
  db: D1Database,
  userId: string,
  name: string,
  parentId: number | null,
) {
  const d1 = drizzle(db);
  const result = await d1
    .select()
    .from(folders_table)
    .where(
      and(
        eq(folders_table.user_id, userId.toLowerCase()),
        eq(folders_table.name, name),
        parentId === null
          ? sql`${folders_table.parent_id} IS NULL`
          : eq(folders_table.parent_id, parentId),
      ),
    )
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function get_folder_by_id(db: D1Database, folderId: number) {
  const d1 = drizzle(db);
  const result = await d1
    .select()
    .from(folders_table)
    .where(eq(folders_table.id, folderId))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function delete_folder(db: D1Database, folderId: number) {
  const d1 = drizzle(db);
  await d1.delete(folders_table).where(eq(folders_table.id, folderId));
}

export async function get_folder_path(
  db: D1Database,
  folderId: number | null,
): Promise<string> {
  if (folderId === null) return "";
  const folder = await get_folder_by_id(db, folderId);
  if (!folder) return "";
  const parentPath = await get_folder_path(db, folder.parent_id);
  return parentPath ? `${parentPath}/${folder.name}` : folder.name;
}
