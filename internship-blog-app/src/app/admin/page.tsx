import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteJourneyAdminAction,
  deletePostAdminAction,
  deleteUserAction,
  setUserRoleAction,
  setUserStatusAction,
  updateJourneyAdminAction,
  updatePostAdminAction,
} from "@/features/admin/admin.actions";
import { getAdminJourneys, getAdminPosts, getAdminUsers } from "@/features/admin/admin.server";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { getCurrentUser } from "@/features/auth/auth.server";

type AdminTab = "users" | "journeys" | "posts";

function parseTab(tab: string | undefined): AdminTab {
  if (tab === "journeys" || tab === "posts") return tab;
  return "users";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TabLink({ tab, activeTab, label }: { tab: AdminTab; activeTab: AdminTab; label: string }) {
  return (
    <Button asChild variant={activeTab === tab ? "default" : "outline"} size="sm">
      <Link href={`/admin?tab=${tab}`}>{label}</Link>
    </Button>
  );
}

async function setUserRoleFormAction(formData: FormData) {
  "use server";
  await setUserRoleAction(formData);
}

async function setUserStatusFormAction(formData: FormData) {
  "use server";
  await setUserStatusAction(formData);
}

async function deleteUserFormAction(formData: FormData) {
  "use server";
  await deleteUserAction(formData);
}

async function updateJourneyFormAction(formData: FormData) {
  "use server";
  await updateJourneyAdminAction(formData);
}

async function deleteJourneyFormAction(formData: FormData) {
  "use server";
  await deleteJourneyAdminAction(formData);
}

async function updatePostFormAction(formData: FormData) {
  "use server";
  await updatePostAdminAction(formData);
}

async function deletePostFormAction(formData: FormData) {
  "use server";
  await deletePostAdminAction(formData);
}

function UsersSection({
  users,
  currentUserId,
}: {
  users: Awaited<ReturnType<typeof getAdminUsers>>;
  currentUserId: string;
}) {
  return (
    <div className="space-y-4">
      {users.map((user) => (
        <article key={user.id} className="surface-card p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg">@{user.username}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">
                Role: <span className="capitalize">{user.role}</span> | Joined {formatDate(user.created_at)}
              </p>
              <div className="mt-2">
                <Badge variant={user.status === "banned" ? "destructive" : "secondary"}>
                  {user.status === "banned" ? "Banned" : "Active"}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user.role !== "admin" ? (
                <form action={setUserRoleFormAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <input type="hidden" name="nextRole" value="admin" />
                  <Button type="submit" size="sm" variant="outline">
                    Promote to admin
                  </Button>
                </form>
              ) : (
                <form action={setUserRoleFormAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <input type="hidden" name="nextRole" value="user" />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    disabled={user.id === currentUserId}
                  >
                    Demote to user
                  </Button>
                </form>
              )}

              {user.status === "active" ? (
                <form action={setUserStatusFormAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <input type="hidden" name="nextStatus" value="banned" />
                  <Button type="submit" size="sm" variant="outline" disabled={user.id === currentUserId}>
                    Ban user
                  </Button>
                </form>
              ) : (
                <form action={setUserStatusFormAction}>
                  <input type="hidden" name="targetUserId" value={user.id} />
                  <input type="hidden" name="nextStatus" value="active" />
                  <Button type="submit" size="sm" variant="outline">
                    Unban user
                  </Button>
                </form>
              )}

              <form action={deleteUserFormAction}>
                <input type="hidden" name="targetUserId" value={user.id} />
                <Button type="submit" size="sm" variant="destructive" disabled={user.id === currentUserId}>
                  Delete user
                </Button>
              </form>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function JourneysSection({ journeys }: { journeys: Awaited<ReturnType<typeof getAdminJourneys>> }) {
  return (
    <div className="space-y-4">
      {journeys.map((journey) => (
        <article key={journey.id} className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg">{journey.title}</h3>
              <p className="text-sm text-muted-foreground">
                Owner: @{journey.owner_username ?? "unknown"} | Created {formatDate(journey.created_at)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/journeys/${journey.id}`}>Open journey</Link>
            </Button>
          </div>

          <form action={updateJourneyFormAction} className="grid gap-2 md:grid-cols-[1fr_160px_160px_auto]">
            <input type="hidden" name="journeyId" value={journey.id} />
            <input
              type="text"
              name="title"
              defaultValue={journey.title}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              required
            />
            <select
              name="visibility"
              defaultValue={journey.visibility}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="public">public</option>
              <option value="unlisted">unlisted</option>
              <option value="private">private</option>
            </select>
            <select
              name="status"
              defaultValue={journey.status}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">active</option>
              <option value="completed">completed</option>
            </select>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>

          <form action={deleteJourneyFormAction}>
            <input type="hidden" name="journeyId" value={journey.id} />
            <Button type="submit" size="sm" variant="destructive">
              Delete journey
            </Button>
          </form>
        </article>
      ))}
    </div>
  );
}

function PostsSection({ posts }: { posts: Awaited<ReturnType<typeof getAdminPosts>> }) {
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <article key={post.id} className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h3 className="font-semibold text-lg">{post.title}</h3>
              <p className="text-sm text-muted-foreground">
                Author: @{post.author_username ?? "unknown"} | Journey: {post.journey_title ?? "Unknown"} | Created{" "}
                {formatDate(post.created_at)}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={`/posts/${post.id}`}>Open post</Link>
            </Button>
          </div>

          <form action={updatePostFormAction} className="grid gap-2 md:grid-cols-[1fr_160px_auto]">
            <input type="hidden" name="postId" value={post.id} />
            <input
              type="text"
              name="title"
              defaultValue={post.title}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              required
            />
            <select
              name="status"
              defaultValue={post.status}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
            <Button type="submit" size="sm">
              Save
            </Button>
          </form>

          <form action={deletePostFormAction}>
            <input type="hidden" name="postId" value={post.id} />
            <Button type="submit" size="sm" variant="destructive">
              Delete post
            </Button>
          </form>
        </article>
      ))}
    </div>
  );
}

interface AdminPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export const metadata = {
  title: "Admin | Internship Blog App",
  description: "Admin dashboard",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  if (!user) {
    redirect("/login");
  }

  if (!profile || profile.role !== "admin") {
    notFound();
  }

  const params = await searchParams;
  const tab = parseTab(params.tab);

  const [users, journeys, posts] = await Promise.all([
    getAdminUsers(),
    getAdminJourneys(),
    getAdminPosts(),
  ]);

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl space-y-6">
      <section className="surface-card p-4 sm:p-6 space-y-4">
        <div>
          <p className="muted-pill mb-3">Governance</p>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">Manage all users, journeys, and posts platform-wide.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabLink tab="users" activeTab={tab} label="Users" />
          <TabLink tab="journeys" activeTab={tab} label="Journeys" />
          <TabLink tab="posts" activeTab={tab} label="Posts" />
        </div>
      </section>

      {tab === "users" && <UsersSection users={users} currentUserId={user.id} />}
      {tab === "journeys" && <JourneysSection journeys={journeys} />}
      {tab === "posts" && <PostsSection posts={posts} />}
    </main>
  );
}
