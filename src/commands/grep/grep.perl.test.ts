import { describe, expect, it } from "vitest";
import { Bash } from "../../Bash.js";

describe("grep Perl regex (-P)", () => {
  describe("\\K reset match start", () => {
    it("should extract text after \\K with -oP", async () => {
      const env = new Bash({
        files: { "/test.txt": "foo=bar\nbaz=qux\n" },
      });
      const result = await env.exec("grep -oP '=\\K\\w+' /test.txt");
      expect(result.stdout).toBe("bar\nqux\n");
      expect(result.exitCode).toBe(0);
    });

    it("should work with \\K in useEffect pattern", async () => {
      const env = new Bash({
        files: {
          "/app.tsx":
            "useEffect(() => { }, [count]);\nuseEffect(() => { }, [name, id]);\n",
        },
      });
      const result = await env.exec(
        'grep -oP "useEffect\\(.*?\\[\\K[^\\]]+" /app.tsx',
      );
      expect(result.stdout).toBe("count\nname, id\n");
      expect(result.exitCode).toBe(0);
    });

    it("should handle \\K with lookahead pattern", async () => {
      const env = new Bash({
        files: { "/test.txt": "price: $100\nprice: $250\n" },
      });
      const result = await env.exec("grep -oP 'price: \\$\\K\\d+' /test.txt");
      expect(result.stdout).toBe("100\n250\n");
      expect(result.exitCode).toBe(0);
    });

    it("should extract URLs after protocol with \\K", async () => {
      const env = new Bash({
        files: {
          "/test.txt":
            "http://example.com\nhttps://test.org\nftp://files.net\n",
        },
      });
      const result = await env.exec("grep -oP 'https?://\\K[^\\s]+' /test.txt");
      expect(result.stdout).toBe("example.com\ntest.org\n");
      expect(result.exitCode).toBe(0);
    });

    it("should work with multiple files", async () => {
      const env = new Bash({
        files: {
          "/a.txt": "key=value1\n",
          "/b.txt": "key=value2\n",
        },
      });
      const result = await env.exec("grep -oP 'key=\\K\\w+' /a.txt /b.txt");
      expect(result.stdout).toBe("/a.txt:value1\n/b.txt:value2\n");
      expect(result.exitCode).toBe(0);
    });

    it("should return empty when \\K capture group is empty", async () => {
      const env = new Bash({
        files: { "/test.txt": "prefix\n" },
      });
      const result = await env.exec("grep -oP 'prefix\\K' /test.txt");
      // After \K, there's nothing to match, but the line still matches
      expect(result.stdout).toBe("\n");
      expect(result.exitCode).toBe(0);
    });

    it("should work with -h flag to suppress filename", async () => {
      const env = new Bash({
        files: {
          "/a.txt": "x=1\n",
          "/b.txt": "x=2\n",
        },
      });
      const result = await env.exec("grep -ohP 'x=\\K\\d+' /a.txt /b.txt");
      expect(result.stdout).toBe("1\n2\n");
      expect(result.exitCode).toBe(0);
    });
  });

  describe("Perl regex without \\K", () => {
    it("should support (?P<name>) named groups", async () => {
      const env = new Bash({
        files: { "/test.txt": "hello world\n" },
      });
      const result = await env.exec("grep -P '(?P<word>\\w+)' /test.txt");
      expect(result.stdout).toBe("hello world\n");
      expect(result.exitCode).toBe(0);
    });

    it("should support non-greedy quantifiers", async () => {
      const env = new Bash({
        files: { "/test.txt": "<a>text</a>\n" },
      });
      const result = await env.exec("grep -oP '<.*?>' /test.txt");
      expect(result.stdout).toBe("<a>\n</a>\n");
      expect(result.exitCode).toBe(0);
    });
  });
});
