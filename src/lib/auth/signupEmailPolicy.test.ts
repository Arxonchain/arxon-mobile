import { describe, expect, it } from "vitest";
import { getSignupEmailRejection, normalizeEmailDomain } from "./signupEmailPolicy";

describe("signupEmailPolicy", () => {
  it("normalizes email domain", () => {
    expect(normalizeEmailDomain("User@Mailinator.COM")).toBe("mailinator.com");
    expect(normalizeEmailDomain("not-an-email")).toBeNull();
  });

  it("blocks exact disposable domains", () => {
    expect(getSignupEmailRejection("a@mailinator.com")).toMatch(/not allowed/i);
    expect(getSignupEmailRejection("a@yopmail.com")).toMatch(/not allowed/i);
  });

  it("blocks domain substrings", () => {
    expect(getSignupEmailRejection("a@foo-tempmail-bar.com")).toMatch(/disposable/i);
  });

  it("allows common providers", () => {
    expect(getSignupEmailRejection("user@gmail.com")).toBeNull();
    expect(getSignupEmailRejection("user@outlook.com")).toBeNull();
    expect(getSignupEmailRejection("user@hotmail.co.uk")).toBeNull();
  });
});
