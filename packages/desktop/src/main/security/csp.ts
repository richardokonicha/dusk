import { randomUUID } from "node:crypto";
import type { BrowserWindow } from "electron";

export interface CspConfig {
  nonceLength?: number;
  allowedScriptSrc?: string[];
  allowedStyleSrc?: string[];
  allowedImgSrc?: string[];
  allowedFontSrc?: string[];
  allowedConnectSrc?: string[];
  allowedFrameSrc?: string[];
  reportUri?: string;
}

export class CspManager {
  private nonce: string;
  private config: Required<CspConfig>;

  constructor(config: CspConfig = {}) {
    this.nonce = this.generateNonce(config.nonceLength);
    this.config = {
      nonceLength: config.nonceLength ?? 32,
      allowedScriptSrc: config.allowedScriptSrc ?? ["'self'"],
      allowedStyleSrc: config.allowedStyleSrc ?? ["'self'", "'unsafe-inline'"],
      allowedImgSrc: config.allowedImgSrc ?? ["'self'", "data:", "https:"],
      allowedFontSrc: config.allowedFontSrc ?? ["'self'", "data:"],
      allowedConnectSrc: config.allowedConnectSrc ?? ["'self'", "https:"],
      allowedFrameSrc: config.allowedFrameSrc ?? ["'none'"],
      reportUri: config.reportUri ?? "",
    };
  }

  generateNonce(length = 32): string {
    return randomUUID().replace(/-/g, "").slice(0, length);
  }

  getNonce(): string {
    return this.nonce;
  }

  buildPolicy(): string {
    const parts = [
      `default-src 'self'`,
      `script-src ${this.config.allowedScriptSrc.join(" ")} 'nonce-${this.nonce}'`,
      `style-src ${this.config.allowedStyleSrc.join(" ")} 'nonce-${this.nonce}'`,
      `img-src ${this.config.allowedImgSrc.join(" ")}`,
      `font-src ${this.config.allowedFontSrc.join(" ")}`,
      `connect-src ${this.config.allowedConnectSrc.join(" ")}`,
      `frame-src ${this.config.allowedFrameSrc.join(" ")}`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
      `upgrade-insecure-requests`,
    ];

    if (this.config.reportUri) {
      parts.push(`report-uri ${this.config.reportUri}`);
    }

    return parts.join("; ");
  }

  buildMetaTag(): string {
    return `<meta http-equiv="Content-Security-Policy" content="${this.buildPolicy()}">`;
  }

  buildHeader(): Record<string, string> {
    return {
      "Content-Security-Policy": this.buildPolicy(),
    };
  }

  getScriptNonceAttr(): string {
    return `nonce="${this.nonce}"`;
  }

  getStyleNonceAttr(): string {
    return `nonce="${this.nonce}"`;
  }

  rotateNonce(): string {
    this.nonce = this.generateNonce(this.config.nonceLength);
    return this.nonce;
  }

  injectNonceIntoHtml(html: string, placeholder = "{{CSP_NONCE}}"): string {
    const policy = this.buildPolicy();
    const nonceMeta = `<meta name="csp-nonce" content="${this.nonce}">`;
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="${policy}">`;

    const escapedPlaceholder = placeholder.replace(/[{}]/g, "\\$&");
    let result = html.replace(new RegExp(escapedPlaceholder, "g"), this.nonce);

    if (!result.includes('meta name="csp-nonce"')) {
      result = result.replace(/<head\b/i, (match) => `${match}\n  ${nonceMeta}`);
    }
    if (!result.includes('http-equiv="Content-Security-Policy"')) {
      result = result.replace(/<head\b/i, (match) => `${match}\n  ${cspMeta}`);
    }

    return result;
  }

  setCspHeader(browserWindow: BrowserWindow): void {
    const policy = this.buildPolicy();
    const filter = { urls: ["*://*/*", "file://*/*"] };

    browserWindow.webContents.session.webRequest.onHeadersReceived(
      filter,
      (details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            "Content-Security-Policy": [policy],
          },
        });
      }
    );
  }
}

export function createCspManager(config?: CspConfig): CspManager {
  return new CspManager(config);
}
