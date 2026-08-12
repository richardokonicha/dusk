import { describe, it, expect } from "vitest";
import { workspaceListSchema, workspaceCreateSchema, workspaceGetSchema } from "../validator";

describe("IPC Validators", () => {
  describe("workspaceListSchema", () => {
    it("accepts empty object", () => {
      const result = workspaceListSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts optional workspaceId", () => {
      const result = workspaceListSchema.safeParse({ workspaceId: "123e4567-e89b-12d3-a456-426614174000" });
      expect(result.success).toBe(true);
    });

    it("rejects non-uuid workspaceId", () => {
      const result = workspaceListSchema.safeParse({ workspaceId: "not-a-uuid" });
      expect(result.success).toBe(false);
    });
  });

  describe("workspaceCreateSchema", () => {
    it("accepts valid input", () => {
      const result = workspaceCreateSchema.safeParse({
        name: "My Workspace",
        path: "/path/to/workspace",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty name", () => {
      const result = workspaceCreateSchema.safeParse({ name: "", path: "/path" });
      expect(result.success).toBe(false);
    });

    it("rejects empty path", () => {
      const result = workspaceCreateSchema.safeParse({ name: "Workspace", path: "" });
      expect(result.success).toBe(false);
    });

    it("rejects name exceeding 255 chars", () => {
      const result = workspaceCreateSchema.safeParse({ name: "a".repeat(256), path: "/path" });
      expect(result.success).toBe(false);
    });
  });

  describe("workspaceGetSchema", () => {
    it("accepts valid uuid", () => {
      const result = workspaceGetSchema.safeParse({
        workspaceId: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects missing workspaceId", () => {
      const result = workspaceGetSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejects invalid workspaceId", () => {
      const result = workspaceGetSchema.safeParse({ workspaceId: "invalid" });
      expect(result.success).toBe(false);
    });
  });
});
