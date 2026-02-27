import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "./auth.actions";
import { createClient } from "@/services/supabase/server";
import { checkUsernameTaken, createProfileForUser } from "@/features/profiles/profile.service";

vi.mock("@/services/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/features/profiles/profile.service", () => ({
  checkUsernameTaken: vi.fn(),
  createProfileForUser: vi.fn(),
}));

describe("registerUser", () => {
  const createClientMock = vi.mocked(createClient);
  const checkUsernameTakenMock = vi.mocked(checkUsernameTaken);
  const createProfileForUserMock = vi.mocked(createProfileForUser);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects missing fields", async () => {
    const formData = new FormData();
    const result = await registerUser(formData);
    expect(result).toEqual({ error: "Missing required fields" });
  });

  it("rejects already taken username", async () => {
    checkUsernameTakenMock.mockResolvedValue(true);
    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "abc12345");
    formData.set("username", "taken");

    const result = await registerUser(formData);
    expect(result).toEqual({ error: "Username is already taken" });
  });

  it("returns auth error when signup fails", async () => {
    checkUsernameTakenMock.mockResolvedValue(false);
    createClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: null },
          error: { message: "Auth failed" },
        })),
      },
    } as never);

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "abc12345");
    formData.set("username", "user1");

    const result = await registerUser(formData);
    expect(result).toEqual({ error: "Auth failed" });
  });

  it("returns email already registered when identities is empty", async () => {
    checkUsernameTakenMock.mockResolvedValue(false);
    createClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: "u1", identities: [] } },
          error: null,
        })),
      },
    } as never);

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "abc12345");
    formData.set("username", "user1");

    const result = await registerUser(formData);
    expect(result).toEqual({ error: "Email is already registered" });
  });

  it("returns profile setup error when profile creation fails", async () => {
    checkUsernameTakenMock.mockResolvedValue(false);
    createClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: "u1", identities: [{ id: "id-1" }] } },
          error: null,
        })),
      },
    } as never);
    createProfileForUserMock.mockResolvedValue({ error: "profile failed" });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "abc12345");
    formData.set("username", "user1");

    const result = await registerUser(formData);
    expect(result).toEqual({
      error: "Account created, but failed to set up profile. Please contact support.",
    });
  });

  it("returns success when all steps pass", async () => {
    checkUsernameTakenMock.mockResolvedValue(false);
    createClientMock.mockResolvedValue({
      auth: {
        signUp: vi.fn(async () => ({
          data: { user: { id: "u1", identities: [{ id: "id-1" }] } },
          error: null,
        })),
      },
    } as never);
    createProfileForUserMock.mockResolvedValue({ error: null });

    const formData = new FormData();
    formData.set("email", "user@example.com");
    formData.set("password", "abc12345");
    formData.set("username", "user1");

    const result = await registerUser(formData);
    expect(result).toEqual({ success: true });
  });
});
