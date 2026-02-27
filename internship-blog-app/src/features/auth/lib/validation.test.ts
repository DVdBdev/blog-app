import {
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateUsername,
} from "./validation";

describe("auth validation", () => {
  it("validates email", () => {
    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail("bad-email")).toBe("Please enter a valid email address");
    expect(validateEmail("user@example.com")).toBeNull();
  });

  it("validates password", () => {
    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword("abc12")).toBe("Password must be at least 8 characters long");
    expect(validatePassword("abcdefgh")).toBe("Password must contain at least one letter and one number");
    expect(validatePassword("abc12345")).toBeNull();
  });

  it("validates username", () => {
    expect(validateUsername("")).toBe("Username is required");
    expect(validateUsername("ab")).toBe("Username must be at least 3 characters long");
    expect(validateUsername("this_username_is_way_too_long")).toBe("Username must be less than 20 characters");
    expect(validateUsername("BadName")).toBe(
      "Username can only contain lowercase letters, numbers, and underscores"
    );
    expect(validateUsername("valid_name_1")).toBeNull();
  });

  it("validates confirm password", () => {
    expect(validateConfirmPassword("abc12345", "")).toBe("Please confirm your password");
    expect(validateConfirmPassword("abc12345", "abc12346")).toBe("Passwords do not match");
    expect(validateConfirmPassword("abc12345", "abc12345")).toBeNull();
  });
});
