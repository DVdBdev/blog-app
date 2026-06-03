import { describe, expect, it } from "vitest";
import {
  containsIlikeFilter,
  escapeLikePattern,
  quotePostgrestFilterValue,
} from "./postgrest-filters";

describe("postgrest filter helpers", () => {
  it("escapes SQL LIKE wildcards and backslashes", () => {
    expect(escapeLikePattern("100%_done\\ok")).toBe("100\\%\\_done\\\\ok");
  });

  it("quotes PostgREST filter values with grammar characters as data", () => {
    expect(quotePostgrestFilterValue('x"),id.not.is.null,\\')).toBe(
      String.raw`"x\"),id.not.is.null,\\"`,
    );
  });

  it("builds a quoted ilike containment filter", () => {
    expect(containsIlikeFilter("username", "alice%,email.not.is.null")).toBe(
      String.raw`username.ilike."%alice\\%,email.not.is.null%"`,
    );
  });
});
