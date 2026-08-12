import { fileURLToPath } from "node:url";
import { isAbsolute, relative, normalize } from "node:path";
import { app } from "electron";

export interface UrlValidationOptions {
  allowedProtocols: string[];
  allowedHosts?: string[];
  blockPrivateIPs: boolean;
  blockCloudMetadata: boolean;
  allowedPaths?: string[];
}

interface ValidationResult {
  valid: boolean;
  reason?: string;
  sanitized?: string;
}

const PRIVATE_IP_RANGES = [
  { start: "10.0.0.0", end: "10.255.255.255" },
  { start: "172.16.0.0", end: "172.31.255.255" },
  { start: "192.168.0.0", end: "192.168.255.255" },
  { start: "127.0.0.0", end: "127.255.255.255" },
  { start: "169.254.0.0", end: "169.254.255.255" },
  { start: "0.0.0.0", end: "0.255.255.255" },
];

const CLOUD_METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "100.100.100.200",
]);

function ipToNumber(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0);
}

function isPrivateIP(ip: string): boolean {
  const num = ipToNumber(ip);
  return PRIVATE_IP_RANGES.some(
    (range) => num >= ipToNumber(range.start) && num <= ipToNumber(range.end)
  );
}

function isIPAddress(hostname: string): boolean {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
}

export class URLValidator {
  private allowedProtocols: Set<string>;
  private allowedHosts: Set<string>;
  private blockPrivateIPs: boolean;
  private blockCloudMetadata: boolean;
  private allowedPaths: string[];

  constructor(options: UrlValidationOptions) {
    this.allowedProtocols = new Set(options.allowedProtocols);
    this.allowedHosts = new Set(options.allowedHosts ?? []);
    this.blockPrivateIPs = options.blockPrivateIPs;
    this.blockCloudMetadata = options.blockCloudMetadata;
    this.allowedPaths = options.allowedPaths ?? [];
  }

  validate(input: string): ValidationResult {
    if (!input || typeof input !== "string") {
      return { valid: false, reason: "URL must be a non-empty string" };
    }

    let parsed: URL;
    try {
      parsed = new URL(input);
    } catch {
      return { valid: false, reason: "Invalid URL format" };
    }

    const protocol = parsed.protocol.toLowerCase();
    if (!this.allowedProtocols.has(protocol)) {
      return { valid: false, reason: `Blocked URL protocol: ${protocol}` };
    }

    if (protocol === "javascript:") {
      return { valid: false, reason: "javascript: URLs are blocked" };
    }

    if (protocol === "data:") {
      return { valid: false, reason: "data: URLs are blocked" };
    }

    if (protocol === "file:") {
      return this.validateFileUrl(parsed);
    }

    if (protocol === "https:" || protocol === "http:") {
      return this.validateHttpUrl(parsed);
    }

    if (protocol === "mailto:") {
      return this.validateMailtoUrl(parsed);
    }

    return { valid: true, sanitized: parsed.toString() };
  }

  private validateFileUrl(parsed: URL): ValidationResult {
    const appRoot = this.getAppRoot();
    let filePath: string;

    try {
      filePath = fileURLToPath(parsed);
    } catch {
      return { valid: false, reason: "Invalid file URL path" };
    }

    const normalized = normalize(filePath);

    const isInsideApp = this.isPathInside(normalized, appRoot);
    const isAllowedPath = this.allowedPaths.some((allowed) =>
      this.isPathInside(normalized, allowed)
    );

    if (!isInsideApp && !isAllowedPath) {
      return {
        valid: false,
        reason: `file: URL outside allowed directories: ${normalized}`,
      };
    }

    return { valid: true, sanitized: parsed.toString() };
  }

  private validateHttpUrl(parsed: URL): ValidationResult {
    const hostname = parsed.hostname.toLowerCase();

    if (this.blockCloudMetadata && CLOUD_METADATA_HOSTS.has(hostname)) {
      return { valid: false, reason: "Blocked cloud metadata endpoint" };
    }

    if (this.allowedHosts.size > 0 && !this.allowedHosts.has(hostname)) {
      return { valid: false, reason: `Host not in allowlist: ${hostname}` };
    }

    if (this.blockPrivateIPs && isIPAddress(hostname)) {
      if (isPrivateIP(hostname)) {
        return { valid: false, reason: "Blocked private IP address" };
      }
    }

    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return { valid: false, reason: "Blocked localhost in external URLs" };
    }

    return { valid: true, sanitized: parsed.toString() };
  }

  private validateMailtoUrl(parsed: URL): ValidationResult {
    if (!parsed.pathname || parsed.pathname.length > 254) {
      return { valid: false, reason: "Invalid mailto address" };
    }

    return { valid: true, sanitized: parsed.toString() };
  }

  private getAppRoot(): string {
    try {
      return app.getAppPath();
    } catch {
      return process.env.APP_ROOT ?? process.cwd();
    }
  }

  private isPathInside(childPath: string, parentDir: string): boolean {
    const rel = relative(parentDir, childPath);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  }

  sanitize(input: string): string {
    const result = this.validate(input);
    return result.valid && result.sanitized ? result.sanitized : "";
  }
}

export function createDefaultUrlValidator(): URLValidator {
  return new URLValidator({
    allowedProtocols: ["https:", "file:", "mailto:"],
    blockPrivateIPs: true,
    blockCloudMetadata: true,
  });
}
