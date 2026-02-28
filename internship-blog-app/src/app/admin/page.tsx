import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  banUserFromModerationAction,
  deleteModerationLogAction,
  deleteAllUserContentFromModerationAction,
  deleteFlaggedContentFromModerationAction,
  deleteJourneyAdminAction,
  deletePostAdminAction,
  deleteUserAction,
  setModerationStatusAction,
  setModerationStatusBulkAction,
  setUserRoleAction,
  setUserStatusAction,
  updateJourneyAdminAction,
  updatePostAdminAction,
} from "@/features/admin/admin.actions";
import {
  getAdminJourneys,
  getAdminPosts,
  getAdminUsers,
  getModerationQueue,
  type ModerationQueueItem,
} from "@/features/admin/admin.server";
import { AdminTestRunner } from "@/features/admin/components/AdminTestRunner";
import { ModerationConfirmActionDialog } from "@/features/admin/components/ModerationConfirmActionDialog";
import { getCurrentProfile } from "@/features/profiles/profile.server";
import { getCurrentUser } from "@/features/auth/auth.server";

type AdminTab = "users" | "journeys" | "posts" | "moderation" | "tests";

function parseTab(tab: string | undefined): AdminTab {
  if (
    tab === "journeys" ||
    tab === "posts" ||
    tab === "tests" ||
    tab === "moderation"
  ) {
    return tab;
  }
  return "users";
}

function parseRoleFilter(value: string | undefined): "all" | "user" | "admin" {
  if (value === "user" || value === "admin") return value;
  return "all";
}

function parsePostStatusFilter(value: string | undefined): "all" | "draft" | "published" {
  if (value === "draft" || value === "published") return value;
  return "all";
}

function parseModerationStatusFilter(
  value: string | undefined
): "all" | "pending" | "reviewed" | "dismissed" | "action_taken" {
  if (value === "pending" || value === "reviewed" || value === "dismissed" || value === "action_taken") return value;
  return "all";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatContentType(value: string) {
  return value.replaceAll("_", " ");
}

function formatModerationReason(reason: string | null) {
  if (!reason) return null;

  const normalized = reason.replace(/\s+/g, " ").trim();
  const hasScore = /\((0(?:\.\d+)?|1(?:\.0+)?)\)/.test(normalized);
  if (hasScore) {
    return normalized.replace(/\((0(?:\.\d+)?|1(?:\.0+)?)\)/g, (_, raw: string) => {
      const percent = Math.round(Number(raw) * 100);
      return `(${raw} / ${percent}%)`;
    });
  }

  // Local rule/fallback reasons do not carry model label scores.
  return `${normalized} (local rule 1.00 / 100%)`;
}

function getModerationRelatedContentLink(
  entry: ModerationQueueItem
) {
  if (!entry.related_entity_id) {
    return entry.username ? `/u/${entry.username}` : "/admin?tab=users";
  }

  if (entry.content_type === "post_title" || entry.content_type === "post_content") {
    return `/posts/${entry.related_entity_id}`;
  }
  if (entry.content_type === "post_image") {
    return `/posts/${entry.related_entity_id}`;
  }
  if (entry.content_type === "journey_title" || entry.content_type === "journey_description") {
    return `/journeys/${entry.related_entity_id}`;
  }
  return entry.username ? `/u/${entry.username}` : "/admin?tab=users";
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

async function setModerationStatusFormAction(formData: FormData) {
  "use server";
  await setModerationStatusAction(formData);
}

async function setModerationStatusBulkFormAction(formData: FormData) {
  "use server";
  await setModerationStatusBulkAction(formData);
}

async function banUserFromModerationFormAction(formData: FormData) {
  "use server";
  return await banUserFromModerationAction(formData);
}

async function deleteFlaggedContentFromModerationFormAction(formData: FormData) {
  "use server";
  return await deleteFlaggedContentFromModerationAction(formData);
}

async function deleteAllUserContentFromModerationFormAction(formData: FormData) {
  "use server";
  return await deleteAllUserContentFromModerationAction(formData);
}

async function deleteModerationLogFormAction(formData: FormData) {
  "use server";
  return await deleteModerationLogAction(formData);
}

function UsersSection({
  users,
  currentUserId,
  query,
  role,
}: {
  users: Awaited<ReturnType<typeof getAdminUsers>>;
  currentUserId: string;
  query: string;
  role: "all" | "user" | "admin";
}) {
  return (
    <div className="space-y-4">
      <form action="/admin" method="get" className="surface-card p-4 sm:p-5">
        <input type="hidden" name="tab" value="users" />
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-center">
          <input
            type="text"
            name="userQuery"
            defaultValue={query}
            placeholder="Search by username or email"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            name="userRole"
            defaultValue={role}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All roles</option>
            <option value="user">Users only</option>
            <option value="admin">Admins only</option>
          </select>
          <Button type="submit" size="sm">Search</Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin?tab=users">Clear</Link>
          </Button>
        </div>
      </form>

      {users.length === 0 ? (
        <div className="surface-card p-6 text-center text-muted-foreground">No users found.</div>
      ) : null}

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
                <Badge
                  variant={user.status === "banned" ? "destructive" : "secondary"}
                  className={user.status === "banned" ? "text-white" : undefined}
                >
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

              {!(user.role === "admin" && user.id !== currentUserId) &&
                (user.status === "active" ? (
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
                ))}

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

function JourneysSection({
  journeys,
  query,
}: {
  journeys: Awaited<ReturnType<typeof getAdminJourneys>>;
  query: string;
}) {
  return (
    <div className="space-y-4">
      <form action="/admin" method="get" className="surface-card p-4 sm:p-5">
        <input type="hidden" name="tab" value="journeys" />
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <input
            type="text"
            name="journeyQuery"
            defaultValue={query}
            placeholder="Search by journey title or owner username"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button type="submit" size="sm">Search</Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin?tab=journeys">Clear</Link>
          </Button>
        </div>
      </form>

      {journeys.length === 0 ? (
        <div className="surface-card p-6 text-center text-muted-foreground">No journeys found.</div>
      ) : null}

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

function PostsSection({
  posts,
  query,
  status,
}: {
  posts: Awaited<ReturnType<typeof getAdminPosts>>;
  query: string;
  status: "all" | "draft" | "published";
}) {
  return (
    <div className="space-y-4">
      <form action="/admin" method="get" className="surface-card p-4 sm:p-5">
        <input type="hidden" name="tab" value="posts" />
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-center">
          <input
            type="text"
            name="postQuery"
            defaultValue={query}
            placeholder="Search by post title or author username"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            name="postStatus"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <Button type="submit" size="sm">Search</Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin?tab=posts">Clear</Link>
          </Button>
        </div>
      </form>

      {posts.length === 0 ? (
        <div className="surface-card p-6 text-center text-muted-foreground">No posts found.</div>
      ) : null}

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

function ModerationSection({
  entries,
  status,
  query,
}: {
  entries: ModerationQueueItem[];
  status: "all" | "pending" | "reviewed" | "dismissed" | "action_taken";
  query: string;
}) {
  const bulkFormId = "moderation-bulk-action-form";

  return (
    <div className="space-y-4">
      <form action="/admin" method="get" className="surface-card p-4 sm:p-5">
        <input type="hidden" name="tab" value="moderation" />
        <div className="grid gap-3 md:grid-cols-[1fr_180px_auto_auto] md:items-center">
          <input
            type="text"
            name="moderationQuery"
            defaultValue={query}
            placeholder="Search by user, reason, type, or preview"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
          <select
            name="moderationStatus"
            defaultValue={status}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Dismissed</option>
            <option value="action_taken">Action taken</option>
          </select>
          <Button type="submit" size="sm">Search</Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin?tab=moderation">Clear</Link>
          </Button>
        </div>
      </form>

      {entries.length === 0 ? (
        <div className="surface-card p-6 text-center text-muted-foreground">No moderation flags found.</div>
      ) : null}

      {entries.length > 0 ? (
        <form id={bulkFormId} action={setModerationStatusBulkFormAction} className="surface-card p-4 sm:p-5 space-y-3">
          <p className="text-sm text-muted-foreground">
            Bulk actions apply only to selected pending entries.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" name="nextStatus" value="reviewed" variant="outline">
              Mark selected reviewed
            </Button>
            <Button type="submit" size="sm" name="nextStatus" value="dismissed" variant="outline">
              Dismiss selected
            </Button>
          </div>
        </form>
      ) : null}

      {entries.map((entry) => {
        const isResolved = entry.status !== "pending";
        const requiresRelatedEntityIdForDelete =
          entry.content_type === "post_title" ||
          entry.content_type === "post_content" ||
          entry.content_type === "post_image" ||
          entry.content_type === "journey_title" ||
          entry.content_type === "journey_description";
        const canDeleteFlaggedContent =
          !requiresRelatedEntityIdForDelete || Boolean(entry.related_entity_id);
        return (
        <article key={entry.id} className="surface-card p-4 sm:p-5 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                name="logIds"
                value={entry.id}
                form={bulkFormId}
                disabled={isResolved}
                aria-label={`Select moderation entry ${entry.id}`}
                className="mt-1 h-4 w-4 rounded border-input bg-background"
              />
              <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                User: @{entry.username ?? "unknown"} | Type: <span className="capitalize">{formatContentType(entry.content_type)}</span> | Created{" "}
                {formatDate(entry.created_at)}
              </p>
              <p className="text-sm">{entry.content_preview}</p>
              {entry.flag_reason ? (
                <p className="text-xs text-muted-foreground">
                  Reason: {formatModerationReason(entry.flag_reason)}
                </p>
              ) : null}
              <Badge
                variant={entry.status === "pending" ? "destructive" : "secondary"}
                className={entry.status === "pending" ? "capitalize text-white" : "capitalize"}
              >
                {entry.status}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Destructive actions require modal confirmation.
              </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href={getModerationRelatedContentLink(entry)}>View related content</Link>
              </Button>

              <form action={setModerationStatusFormAction}>
                <input type="hidden" name="logId" value={entry.id} />
                <input type="hidden" name="nextStatus" value="reviewed" />
                <Button type="submit" size="sm" variant="outline" disabled={isResolved || entry.status === "reviewed"}>
                  Mark reviewed
                </Button>
              </form>

              <form action={setModerationStatusFormAction}>
                <input type="hidden" name="logId" value={entry.id} />
                <input type="hidden" name="nextStatus" value="dismissed" />
                <Button type="submit" size="sm" variant="outline" disabled={isResolved || entry.status === "dismissed"}>
                  Dismiss
                </Button>
              </form>

              <ModerationConfirmActionDialog
                action={banUserFromModerationFormAction}
                title="Ban this user?"
                description="This will set the user status to banned, block login, and mark this moderation entry as action_taken."
                submitLabel="Ban user"
                disabled={isResolved}
                hiddenFields={{
                  logId: entry.id,
                  targetUserId: entry.user_id,
                }}
              />

              {canDeleteFlaggedContent ? (
                <ModerationConfirmActionDialog
                  action={deleteFlaggedContentFromModerationFormAction}
                  title="Delete flagged content?"
                  description="This removes the specific content linked to this moderation item and marks this moderation entry as action_taken."
                  submitLabel="Delete flagged content"
                  disabled={isResolved}
                  hiddenFields={{
                    logId: entry.id,
                    targetUserId: entry.user_id,
                    contentType: entry.content_type,
                    relatedEntityId: entry.related_entity_id ?? "",
                  }}
                />
              ) : null}

              <ModerationConfirmActionDialog
                action={deleteAllUserContentFromModerationFormAction}
                title="Delete all user content?"
                description="This permanently deletes all journeys and posts belonging to this user and marks this moderation entry as action_taken."
                submitLabel="Delete all user content"
                disabled={isResolved}
                hiddenFields={{
                  logId: entry.id,
                  targetUserId: entry.user_id,
                }}
              />

              <ModerationConfirmActionDialog
                action={deleteModerationLogFormAction}
                title="Delete moderation log entry?"
                description="This permanently removes this moderation log row. Use this only when you no longer need this record."
                submitLabel="Delete log"
                hiddenFields={{
                  logId: entry.id,
                }}
              />
            </div>
          </div>
        </article>
        );
      })}
    </div>
  );
}

interface AdminPageProps {
  searchParams: Promise<{
    tab?: string;
    userQuery?: string;
    userRole?: string;
    journeyQuery?: string;
    postQuery?: string;
    postStatus?: string;
    moderationStatus?: string;
    moderationQuery?: string;
  }>;
}

export const metadata = {
  title: "Admin | Internship Blog App",
  description: "Admin dashboard",
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);
  const isProduction = process.env.IS_PRODUCTION === "true";

  if (!user) {
    redirect("/login");
  }

  if (!profile || profile.role !== "admin") {
    notFound();
  }

  const params = await searchParams;
  const tab = parseTab(params.tab);

  if (isProduction && tab === "tests") {
    notFound();
  }
  const userQuery = params.userQuery?.trim() ?? "";
  const userRole = parseRoleFilter(params.userRole);
  const journeyQuery = params.journeyQuery?.trim() ?? "";
  const postQuery = params.postQuery?.trim() ?? "";
  const postStatus = parsePostStatusFilter(params.postStatus);
  const moderationStatus = parseModerationStatusFilter(params.moderationStatus);
  const moderationQuery = params.moderationQuery?.trim() ?? "";

  const [users, rawJourneys, rawPosts, moderationEntries] = await Promise.all([
    getAdminUsers({ query: userQuery, role: userRole }),
    getAdminJourneys(),
    getAdminPosts({ status: postStatus }),
    getModerationQueue({ status: moderationStatus, query: moderationQuery }),
  ]);

  const journeys = journeyQuery
    ? rawJourneys.filter((journey) => {
        const q = journeyQuery.toLowerCase();
        return (
          journey.title.toLowerCase().includes(q) ||
          (journey.owner_username ?? "").toLowerCase().includes(q)
        );
      })
    : rawJourneys;

  const posts = postQuery
    ? rawPosts.filter((post) => {
        const q = postQuery.toLowerCase();
        return (
          post.title.toLowerCase().includes(q) ||
          (post.author_username ?? "").toLowerCase().includes(q)
        );
      })
    : rawPosts;

  return (
    <main className="page-shell container mx-auto py-6 sm:py-8 px-4 max-w-6xl space-y-6">
      <section className="surface-card p-4 sm:p-6 space-y-4">
        <div>
          <p className="muted-pill mb-3">Governance</p>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="section-subtitle">Manage all users, journeys, posts, and moderation queue.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TabLink tab="users" activeTab={tab} label="Users" />
          <TabLink tab="journeys" activeTab={tab} label="Journeys" />
          <TabLink tab="posts" activeTab={tab} label="Posts" />
          <TabLink tab="moderation" activeTab={tab} label="Moderation" />
          {!isProduction ? <TabLink tab="tests" activeTab={tab} label="Tests" /> : null}
        </div>
      </section>

      {tab === "users" && (
        <UsersSection users={users} currentUserId={user.id} query={userQuery} role={userRole} />
      )}
      {tab === "journeys" && <JourneysSection journeys={journeys} query={journeyQuery} />}
      {tab === "posts" && <PostsSection posts={posts} query={postQuery} status={postStatus} />}
      {tab === "moderation" && (
        <ModerationSection entries={moderationEntries} status={moderationStatus} query={moderationQuery} />
      )}
      {!isProduction && tab === "tests" && <AdminTestRunner />}
    </main>
  );
}
