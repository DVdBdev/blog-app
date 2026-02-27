import { createClient } from "@/services/supabase/server";
import { ModerationContentType, ModerationStatus } from "@/types";

export interface AdminUserRow {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
  status: "active" | "banned";
  created_at: string;
}

export interface AdminJourneyRow {
  id: string;
  title: string;
  visibility: "public" | "unlisted" | "private";
  status: "active" | "completed";
  created_at: string;
  owner_id: string;
  owner_username: string | null;
}

export interface AdminPostRow {
  id: string;
  title: string;
  status: "draft" | "published";
  created_at: string;
  journey_id: string;
  journey_title: string | null;
  author_id: string;
  author_username: string | null;
}

export interface ModerationQueueItem {
  id: string;
  user_id: string;
  username: string | null;
  content_type: ModerationContentType;
  related_entity_id: string | null;
  flag_reason: string | null;
  content_preview: string;
  status: ModerationStatus;
  created_at: string;
}

export interface AdminUsersFilter {
  query?: string;
  role?: "user" | "admin" | "all";
}

export interface AdminJourneysFilter {
  query?: string;
}

export interface AdminPostsFilter {
  query?: string;
  status?: "draft" | "published" | "all";
}

export interface ModerationQueueFilter {
  status?: ModerationStatus | "all";
  query?: string;
}

export async function getAdminUsers(filter: AdminUsersFilter = {}): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  const queryText = filter.query?.trim();
  const roleFilter = filter.role ?? "all";

  let query = supabase
    .from("profiles")
    .select("id,username,email,role,status,created_at")
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.or(`username.ilike.%${queryText}%,email.ilike.%${queryText}%`);
  }

  if (roleFilter === "user" || roleFilter === "admin") {
    query = query.eq("role", roleFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading admin users:", error);
    return [];
  }

  return (data ?? []) as AdminUserRow[];
}

export async function getAdminJourneys(filter: AdminJourneysFilter = {}): Promise<AdminJourneyRow[]> {
  const supabase = await createClient();
  const queryText = filter.query?.trim();

  let query = supabase
    .from("journeys")
    .select("id,title,visibility,status,created_at,owner_id,profiles!journeys_owner_id_fkey(username)")
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.ilike("title", `%${queryText}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading admin journeys:", error);
    return [];
  }

  return (data ?? []).map((journey) => ({
    id: journey.id as string,
    title: journey.title as string,
    visibility: journey.visibility as "public" | "unlisted" | "private",
    status: journey.status as "active" | "completed",
    created_at: journey.created_at as string,
    owner_id: journey.owner_id as string,
    owner_username:
      (journey.profiles as { username?: string | null } | null)?.username ?? null,
  }));
}

export async function getAdminPosts(filter: AdminPostsFilter = {}): Promise<AdminPostRow[]> {
  const supabase = await createClient();
  const queryText = filter.query?.trim();
  const statusFilter = filter.status ?? "all";

  let query = supabase
    .from("posts")
    .select("id,title,status,created_at,journey_id,author_id,journeys(title),profiles!posts_author_id_fkey(username)")
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.ilike("title", `%${queryText}%`);
  }

  if (statusFilter === "draft" || statusFilter === "published") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading admin posts:", error);
    return [];
  }

  return (data ?? []).map((post) => ({
    id: post.id as string,
    title: post.title as string,
    status: post.status as "draft" | "published",
    created_at: post.created_at as string,
    journey_id: post.journey_id as string,
    journey_title: (post.journeys as { title?: string | null } | null)?.title ?? null,
    author_id: post.author_id as string,
    author_username:
      (post.profiles as { username?: string | null } | null)?.username ?? null,
  }));
}

function mapModerationEntries(rows: unknown[]): ModerationQueueItem[] {
  return rows.map((entry) => {
    const typed = entry as {
      id: string;
      user_id: string;
      content_type: ModerationContentType;
      related_entity_id: string | null;
      flag_reason: string | null;
      content_preview: string;
      status: ModerationStatus;
      created_at: string;
      profiles: { username?: string | null } | null;
    };

    return {
      id: typed.id,
      user_id: typed.user_id,
      username: typed.profiles?.username ?? null,
      content_type: typed.content_type,
      related_entity_id: typed.related_entity_id,
      flag_reason: typed.flag_reason,
      content_preview: typed.content_preview,
      status: typed.status,
      created_at: typed.created_at,
    };
  });
}

function applyModerationQuery(entries: ModerationQueueItem[], rawQuery: string | undefined): ModerationQueueItem[] {
  const query = rawQuery?.trim().toLowerCase();
  if (!query) return entries;

  return entries.filter((entry) => {
    const fields = [
      entry.username ?? "",
      entry.content_type,
      entry.flag_reason ?? "",
      entry.content_preview,
      entry.status,
    ];
    return fields.some((field) => field.toLowerCase().includes(query));
  });
}

export async function getModerationQueue(filter: ModerationQueueFilter = {}): Promise<ModerationQueueItem[]> {
  const supabase = await createClient();
  const statusFilter = filter.status ?? "all";

  let query = supabase
    .from("moderation_log")
    .select("id,user_id,content_type,related_entity_id,flag_reason,content_preview,status,created_at,profiles:profiles!moderation_log_user_id_fkey(username)")
    .order("created_at", { ascending: false });

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error loading moderation queue:", error);
    return [];
  }

  return applyModerationQuery(mapModerationEntries(data ?? []), filter.query);
}
