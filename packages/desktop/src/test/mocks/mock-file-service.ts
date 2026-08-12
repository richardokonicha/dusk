import { vi } from "vitest";

export const mockFileService = {
  list: vi.fn().mockResolvedValue([]),
  read: vi.fn().mockResolvedValue("file content"),
  write: vi.fn().mockResolvedValue(undefined),
  delete: vi.fn().mockResolvedValue(undefined),
  watch: vi.fn().mockReturnValue({
    [Symbol.asyncIterator]: async function* () {
      yield { type: "change", path: "/test/file.txt" };
    },
  }),
};

export function createFileService() {
  return { ...mockFileService };
}
