import { createClient } from "@/services/supabase/server";

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

export async function getAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id,username,email,role,status,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading admin users:", error);
    return [];
  }

  return (data ?? []) as AdminUserRow[];
}

export async function getAdminJourneys(): Promise<AdminJourneyRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("journeys")
    .select("id,title,visibility,status,created_at,owner_id,profiles!journeys_owner_id_fkey(username)")
    .order("created_at", { ascending: false });

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

export async function getAdminPosts(): Promise<AdminPostRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select("id,title,status,created_at,journey_id,author_id,journeys(title),profiles!posts_author_id_fkey(username)")
    .order("created_at", { ascending: false });

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
