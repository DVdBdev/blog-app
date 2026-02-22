export interface Profile {
  id: string;
  email: string;
  username: string;
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

export interface Journey {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  visibility: JourneyVisibility;
  created_at: string;
  updated_at: string;
}
