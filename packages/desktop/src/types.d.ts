declare module "archiver" {
  export default function archiver(format: string, options?: Record<string, unknown>): {
    on(event: string, callback: (data: Buffer) => void): void;
    append(data: Buffer | string, options?: { name: string }): void;
    finalize(): void;
  };
}

declare module "adm-zip" {
  export class AdmZip {
    constructor(data: Buffer | string);
    getEntries(): { entryName: string }[];
    getEntry(name: string): { entryName: string; getData: () => Buffer } | undefined;
    writeZip(target: string): void;
  }
}
