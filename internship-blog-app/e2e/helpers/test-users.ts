import { createClient } from "@supabase/supabase-js";

type Role = "user" | "admin";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getSupabaseAdminClient() {
  const url = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    const match = users.find((user) => (user.email ?? "").toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (users.length < perPage) return null;

    page += 1;
  }
}

async function ensureUser(params: {
  email: string;
  password: string;
  username: string;
  role: Role;
}) {
  const supabase = getSupabaseAdminClient();
  const existingUserId = await findUserIdByEmail(params.email);

  let userId = existingUserId;

  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: { username: params.username },
    });
    if (error) throw error;
    userId = data.user.id;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password: params.password,
      email_confirm: true,
      user_metadata: { username: params.username },
    });
    if (error) throw error;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email: params.email,
      username: params.username,
      role: params.role,
      status: "active",
    },
    { onConflict: "id" }
  );

  if (profileError) throw profileError;
}

export async function ensureE2ETestUsers() {
  await ensureUser({
    email: getRequiredEnv("E2E_USER_EMAIL"),
    password: getRequiredEnv("E2E_USER_PASSWORD"),
    username: "e2e_user_auto",
    role: "user",
  });

  await ensureUser({
    email: getRequiredEnv("E2E_ADMIN_EMAIL"),
    password: getRequiredEnv("E2E_ADMIN_PASSWORD"),
    username: "e2e_admin_auto",
    role: "admin",
  });
}

export async function cleanupE2ETestUsers() {
  const supabase = getSupabaseAdminClient();
  const emails = [process.env.E2E_USER_EMAIL, process.env.E2E_ADMIN_EMAIL].filter(Boolean) as string[];

  for (const email of emails) {
    const userId = await findUserIdByEmail(email);
    if (!userId) continue;

    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  }
}
