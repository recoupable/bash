/**
 * Browser bundle safety tests
 *
 * These tests verify that the browser bundle:
 * 1. Does not contain Node.js-only imports
 * 2. Does not include browser-excluded commands like yq/xan
 * 3. Shows helpful error messages for browser-excluded commands
 * 4. sqlite3 is opt-in and not included by default
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { Bash } from "./Bash.js";
import { BROWSER_EXCLUDED_COMMANDS } from "./commands/browser-excluded.js";
import { getCommandNames } from "./commands/registry.js";

const browserBundlePath = resolve(__dirname, "../dist/bundle/browser.js");

describe("browser bundle safety", () => {
  describe("bundle contents", () => {
    it("should not contain better-sqlite3 imports", () => {
      const bundleContent = readFileSync(browserBundlePath, "utf-8");
      expect(bundleContent).not.toContain("better-sqlite3");
    });

    it("should not contain sqlite3 command registration", () => {
      const bundleContent = readFileSync(browserBundlePath, "utf-8");
      // The sqlite3 command should not be in the bundle at all
      // since it's opt-in and excluded via __BROWSER__ flag
      expect(bundleContent).not.toContain('name:"sqlite3"');
      expect(bundleContent).not.toContain("sqlite3Command");
    });

    it("should not contain yq command registration", () => {
      const bundleContent = readFileSync(browserBundlePath, "utf-8");
      expect(bundleContent).not.toContain('name:"yq"');
      expect(bundleContent).not.toContain("yqCommand");
    });

    it("should not contain xan command registration", () => {
      const bundleContent = readFileSync(browserBundlePath, "utf-8");
      expect(bundleContent).not.toContain('name:"xan"');
      expect(bundleContent).not.toContain("xanCommand");
    });

    it("should not contain direct node: protocol imports in bundle code", () => {
      const bundleContent = readFileSync(browserBundlePath, "utf-8");
      // The browser bundle should externalize all node: imports
      // Check for common patterns that indicate node: modules are bundled
      // Note: We check for function calls, not just string presence
      // since the external declaration might still reference them
      expect(bundleContent).not.toMatch(/require\s*\(\s*["']node:/);
      expect(bundleContent).not.toMatch(/from\s*["']node:fs["']/);
      expect(bundleContent).not.toMatch(/from\s*["']node:path["']/);
      expect(bundleContent).not.toMatch(/from\s*["']node:child_process["']/);
    });
  });

  describe("browser-excluded commands list", () => {
    it("should include yq in browser-excluded commands", () => {
      expect(BROWSER_EXCLUDED_COMMANDS).toContain("yq");
    });

    it("should include xan in browser-excluded commands", () => {
      expect(BROWSER_EXCLUDED_COMMANDS).toContain("xan");
    });

    it("should NOT include sqlite3 in browser-excluded (it is opt-in)", () => {
      // sqlite3 is opt-in, not browser-excluded
      expect(BROWSER_EXCLUDED_COMMANDS).not.toContain("sqlite3");
    });

    it("should have browser-excluded commands available in Node.js registry", () => {
      // In Node.js environment (where tests run), all commands are available
      // This verifies that browser-excluded commands exist in the full registry
      const commandNames = getCommandNames();

      for (const excludedCmd of BROWSER_EXCLUDED_COMMANDS) {
        // These commands should be available in Node.js
        expect(commandNames).toContain(excludedCmd);
      }
    });
  });

  describe("opt-in commands", () => {
    it("sqlite3 should not be available by default", async () => {
      const bash = new Bash();
      const result = await bash.exec("sqlite3 :memory: 'SELECT 1'");

      // sqlite3 is opt-in, so it should just be "command not found"
      expect(result.stderr).toContain("command not found");
      expect(result.exitCode).toBe(127);
    });

    it("sqlite3 should be available when sqlite option is enabled", async () => {
      const bash = new Bash({ sqlite: true });
      const result = await bash.exec("sqlite3 :memory: 'SELECT 1'");

      expect(result.stdout).toBe("1\n");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("helpful error messages for excluded commands", () => {
    it("should show helpful error when yq is used but not available", async () => {
      const availableCommands = getCommandNames().filter(
        (cmd) => cmd !== "yq",
      ) as import("./commands/registry.js").CommandName[];

      const bash = new Bash({
        commands: availableCommands,
      });

      const result = await bash.exec("yq '.' test.yaml");

      expect(result.stderr).toContain("yq");
      expect(result.stderr).toContain("not available in browser");
      expect(result.stderr).toContain("Exclude");
      expect(result.exitCode).toBe(127);
    });

    it("should show helpful error when xan is used but not available", async () => {
      const availableCommands = getCommandNames().filter(
        (cmd) => cmd !== "xan",
      ) as import("./commands/registry.js").CommandName[];

      const bash = new Bash({
        commands: availableCommands,
      });

      const result = await bash.exec("xan count data.csv");

      expect(result.stderr).toContain("xan");
      expect(result.stderr).toContain("not available in browser");
      expect(result.stderr).toContain("Exclude");
      expect(result.exitCode).toBe(127);
    });

    it("should show standard command not found for non-excluded commands", async () => {
      const bash = new Bash();
      const result = await bash.exec("nonexistentcmd arg1 arg2");

      // Regular unknown command should just say "command not found"
      expect(result.stderr).toContain("command not found");
      expect(result.stderr).not.toContain("browser");
      expect(result.exitCode).toBe(127);
    });
  });
});
