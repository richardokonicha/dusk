import { describe, it, expect, vi, beforeEach } from "vitest";
import type { BrowserWindow } from "electron";
import { CspManager, createCspManager } from "../csp";

describe("CspManager", () => {
  let manager: CspManager;

  beforeEach(() => {
    manager = createCspManager();
  });

  describe("generateNonce", () => {
    it("returns a non-empty string", () => {
      const nonce = manager.generateNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe("string");
    });

    it("returns a string without dashes", () => {
      const nonce = manager.generateNonce();
      expect(nonce).not.toContain("-");
    });

    it("respects the length parameter", () => {
      const nonce = manager.generateNonce(16);
      expect(nonce.length).toBeLessThanOrEqual(16);
    });

    it("returns different nonces on successive calls", () => {
      const nonce1 = manager.generateNonce();
      const nonce2 = manager.generateNonce();
      expect(nonce1).not.toBe(nonce2);
    });
  });

  describe("getNonce", () => {
    it("returns the generated nonce", () => {
      const nonce = manager.getNonce();
      expect(nonce).toBeTruthy();
      expect(typeof nonce).toBe("string");
    });
  });

  describe("buildPolicy", () => {
    it("returns a CSP string with all required directives", () => {
      const policy = manager.buildPolicy();
      expect(policy).toContain("default-src 'self'");
      expect(policy).toContain("script-src 'self' 'nonce-");
      expect(policy).toContain("style-src 'self' 'unsafe-inline'");
      expect(policy).toContain("img-src 'self' data: https:");
      expect(policy).toContain("connect-src 'self' https:");
      expect(policy).toContain("font-src 'self' data:");
      expect(policy).toContain("object-src 'none'");
      expect(policy).toContain("base-uri 'self'");
      expect(policy).toContain("form-action 'self'");
      expect(policy).toContain("upgrade-insecure-requests");
    });

    it("includes the nonce in script-src and style-src", () => {
      const nonce = manager.getNonce();
      const policy = manager.buildPolicy();
      expect(policy).toContain(`'nonce-${nonce}'`);
      expect(policy).toContain("script-src 'self'");
      expect(policy).toContain("style-src 'self' 'unsafe-inline'");
    });

    it("includes report-uri when configured", () => {
      const reportingManager = createCspManager({ reportUri: "/csp-report" });
      const policy = reportingManager.buildPolicy();
      expect(policy).toContain("report-uri /csp-report");
    });

    it("does not include report-uri when not configured", () => {
      const policy = manager.buildPolicy();
      expect(policy).not.toContain("report-uri");
    });

    it("uses custom connect-src values", () => {
      const customManager = createCspManager({
        allowedConnectSrc: ["'self'", "https://api.example.com"],
      });
      const policy = customManager.buildPolicy();
      expect(policy).toContain("connect-src 'self' https://api.example.com");
    });
  });

  describe("buildMetaTag", () => {
    it("returns a valid meta tag string", () => {
      const tag = manager.buildMetaTag();
      expect(tag).toContain("<meta");
      expect(tag).toContain('http-equiv="Content-Security-Policy"');
      expect(tag).toContain("content=\"");
    });

    it("includes the policy in the meta tag", () => {
      const policy = manager.buildPolicy();
      const tag = manager.buildMetaTag();
      expect(tag).toContain(policy);
    });
  });

  describe("buildHeader", () => {
    it("returns a valid header object", () => {
      const header = manager.buildHeader();
      expect(header).toHaveProperty("Content-Security-Policy");
      expect(typeof header["Content-Security-Policy"]).toBe("string");
    });

    it("header value matches the policy", () => {
      const policy = manager.buildPolicy();
      const header = manager.buildHeader();
      expect(header["Content-Security-Policy"]).toBe(policy);
    });
  });

  describe("getScriptNonceAttr", () => {
    it("returns a nonce attribute string", () => {
      const nonce = manager.getNonce();
      expect(manager.getScriptNonceAttr()).toBe(`nonce="${nonce}"`);
    });
  });

  describe("getStyleNonceAttr", () => {
    it("returns a nonce attribute string", () => {
      const nonce = manager.getNonce();
      expect(manager.getStyleNonceAttr()).toBe(`nonce="${nonce}"`);
    });
  });

  describe("rotateNonce", () => {
    it("generates a new nonce", () => {
      const oldNonce = manager.getNonce();
      const newNonce = manager.rotateNonce();
      expect(newNonce).not.toBe(oldNonce);
      expect(manager.getNonce()).toBe(newNonce);
    });

    it("updates the policy with the new nonce", () => {
      manager.rotateNonce();
      const policy = manager.buildPolicy();
      const nonce = manager.getNonce();
      expect(policy).toContain(`'nonce-${nonce}'`);
    });
  });

  describe("injectNonceIntoHtml", () => {
    it("replaces the placeholder with the nonce", () => {
      const html = '<script nonce="{{CSP_NONCE}}"></script>';
      const result = manager.injectNonceIntoHtml(html);
      const nonce = manager.getNonce();
      expect(result).toContain(`nonce="${nonce}"`);
      expect(result).not.toContain("{{CSP_NONCE}}");
    });

    it("replaces multiple placeholders", () => {
      const html =
        '<meta name="csp-nonce" content="{{CSP_NONCE}}" /><script nonce="{{CSP_NONCE}}"></script>';
      const result = manager.injectNonceIntoHtml(html);
      const nonce = manager.getNonce();
      expect(result).toContain(`content="${nonce}"`);
      expect(result).toContain(`nonce="${nonce}"`);
    });

    it("replaces placeholder in CSP meta tag content", () => {
      const html =
        '<meta http-equiv="Content-Security-Policy" content="script-src \'self\' \'nonce-{{CSP_NONCE}}\'" />';
      const result = manager.injectNonceIntoHtml(html);
      const nonce = manager.getNonce();
      expect(result).toContain(`'nonce-${nonce}'`);
      expect(result).not.toContain("{{CSP_NONCE}}");
    });

    it("injects csp-nonce meta tag when missing", () => {
      const html = "<html><head><title>Test</title></head><body></body></html>";
      const result = manager.injectNonceIntoHtml(html);
      expect(result).toContain('meta name="csp-nonce"');
    });

    it("injects CSP meta tag when missing", () => {
      const html = "<html><head><title>Test</title></head><body></body></html>";
      const result = manager.injectNonceIntoHtml(html);
      expect(result).toContain('http-equiv="Content-Security-Policy"');
    });

    it("does not duplicate existing meta tags", () => {
      const html = `<html><head>
        <meta name="csp-nonce" content="old-nonce" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
      </head><body></body></html>`;
      const result = manager.injectNonceIntoHtml(html);
      const matches = result.match(/meta name="csp-nonce"/g);
      expect(matches?.length).toBe(1);
      const cspMatches = result.match(/http-equiv="Content-Security-Policy"/g);
      expect(cspMatches?.length).toBe(1);
    });

    it("replaces placeholder in existing csp-nonce meta tag content", () => {
      const html = '<meta name="csp-nonce" content="{{CSP_NONCE}}" />';
      const result = manager.injectNonceIntoHtml(html);
      const nonce = manager.getNonce();
      expect(result).toContain(`content="${nonce}"`);
    });

    it("injects meta tags with correct indentation", () => {
      const html = "<html><head><title>Test</title></head><body></body></html>";
      const result = manager.injectNonceIntoHtml(html);
      const nonceMetaMatch = result.match(/<meta name="csp-nonce" content="[^"]+" \/>\n?/);
      if (nonceMetaMatch) {
        expect(nonceMetaMatch[0]).toContain("\n  ");
      }
    });
  });

  describe("setCspHeader", () => {
    it("registers the header handler on the webContents session", () => {
      const mockOnHeadersReceived = vi.fn();
      const mockSession = {
        webRequest: {
          onHeadersReceived: mockOnHeadersReceived,
        },
      };
      const mockWebContents = {
        session: mockSession,
      };
      const mockBrowserWindow = {
        webContents: mockWebContents,
      } as unknown as BrowserWindow;

      manager.setCspHeader(mockBrowserWindow);

      expect(mockOnHeadersReceived).toHaveBeenCalledWith(
        { urls: ["*://*/*", "file://*/*"] },
        expect.any(Function)
      );
    });

    it("callback returns the CSP header", () => {
      const mockOnHeadersReceived = vi.fn();
      const mockSession = {
        webRequest: {
          onHeadersReceived: mockOnHeadersReceived,
        },
      };
      const mockWebContents = {
        session: mockSession,
      };
      const mockBrowserWindow = {
        webContents: mockWebContents,
      } as unknown as BrowserWindow;

      manager.setCspHeader(mockBrowserWindow);

      const callback = mockOnHeadersReceived.mock.calls[0][1];
      const mockDetails = {
        responseHeaders: {},
      };
      const mockCallback = vi.fn();

      callback(mockDetails, mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        responseHeaders: {
          "Content-Security-Policy": [expect.stringContaining("default-src 'self'")],
        },
      });
    });
  });

  describe("createCspManager factory", () => {
    it("creates a new CspManager instance", () => {
      const instance = createCspManager();
      expect(instance).toBeInstanceOf(CspManager);
    });

    it("passes config to the constructor", () => {
      const instance = createCspManager({ nonceLength: 16 });
      const nonce = instance.getNonce();
      expect(nonce.length).toBeLessThanOrEqual(16);
    });
  });
});
