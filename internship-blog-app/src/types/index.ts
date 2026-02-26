export type UserRole = "user" | "admin";
export type ProfileStatus = "active" | "banned";

export interface Profile {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: ProfileStatus;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company?: string | null;
  field_domain?: string | null;
  education?: string | null;
  location?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
  website_url?: string | null;
  created_at: string;
  updated_at: string;
}

export type JourneyVisibility = "public" | "unlisted" | "private";
export type JourneyStatus = "active" | "completed";

export interface Journey {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: JourneyVisibility;
  status: JourneyStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PostStatus = "draft" | "published";

export interface Post {
  id: string;
  journey_id: string;
  author_id: string;
  title: string;
  content: Record<string, unknown>; // JSONB
  excerpt: string | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
}
