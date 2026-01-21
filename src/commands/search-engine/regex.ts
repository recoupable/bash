/**
 * Regex building utilities for search commands
 */

export type RegexMode = "basic" | "extended" | "fixed" | "perl";

export interface RegexOptions {
  mode: RegexMode;
  ignoreCase?: boolean;
  wholeWord?: boolean;
  lineRegexp?: boolean;
  multiline?: boolean;
  /** Makes . match newlines in multiline mode (ripgrep --multiline-dotall) */
  multilineDotall?: boolean;
}

export interface RegexResult {
  regex: RegExp;
  /** If \K was used, this is the 1-based index of the capture group containing the "real" match */
  kResetGroup?: number;
}

/**
 * Build a JavaScript RegExp from a pattern with the specified mode
 */
export function buildRegex(
  pattern: string,
  options: RegexOptions,
): RegexResult {
  let regexPattern: string;
  let kResetGroup: number | undefined;

  switch (options.mode) {
    case "fixed":
      // Escape all regex special characters for literal match
      regexPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      break;
    case "extended":
    case "perl": {
      // Convert (?P<name>...) to JavaScript's (?<name>...) syntax
      regexPattern = pattern.replace(/\(\?P<([^>]+)>/g, "(?<$1>");

      // Handle \K (Perl regex reset match start) - only in perl mode
      if (options.mode === "perl") {
        const kResult = handlePerlKReset(regexPattern);
        regexPattern = kResult.pattern;
        kResetGroup = kResult.kResetGroup;
      }
      break;
    }
    default:
      regexPattern = escapeRegexForBasicGrep(pattern);
      break;
  }

  if (options.wholeWord) {
    // Wrap in non-capturing group to handle alternation properly
    // e.g., min|max should become \b(?:min|max)\b, not \bmin|max\b
    // Use (?<!\w) and (?!\w) instead of \b to handle non-word characters
    // This ensures patterns like '.' match individual non-word chars correctly
    regexPattern = `(?<![\\w])(?:${regexPattern})(?![\\w])`;
  }
  if (options.lineRegexp) {
    regexPattern = `^${regexPattern}$`;
  }

  // Build flags:
  // - g: global matching
  // - i: case insensitive
  // - m: multiline (^ and $ match at line boundaries)
  // - s: dotall (. matches newlines)
  const flags =
    "g" +
    (options.ignoreCase ? "i" : "") +
    (options.multiline ? "m" : "") +
    (options.multilineDotall ? "s" : "");
  return { regex: new RegExp(regexPattern, flags), kResetGroup };
}

/**
 * Handle Perl's \K (keep/reset match start) operator.
 * \K causes everything matched before it to be excluded from the final match result.
 *
 * We emulate this by:
 * 1. Wrapping the part before \K in a non-capturing group
 * 2. Wrapping the part after \K in a capturing group
 * 3. Returning the index of that capturing group so the matcher can use it
 */
function handlePerlKReset(pattern: string): {
  pattern: string;
  kResetGroup?: number;
} {
  // Find \K that's not escaped (not preceded by odd number of backslashes)
  // We need to find \K that represents the reset operator, not a literal \\K
  const kIndex = findUnescapedK(pattern);

  if (kIndex === -1) {
    return { pattern };
  }

  const before = pattern.slice(0, kIndex);
  const after = pattern.slice(kIndex + 2); // Skip \K

  // Count existing capturing groups before the split to determine our group number
  const groupsBefore = countCapturingGroups(before);

  // Wrap: (?:before)(after) - non-capturing for prefix, capturing for the part we want
  const newPattern = `(?:${before})(${after})`;

  return {
    pattern: newPattern,
    // The capturing group for "after" will be groupsBefore + 1
    kResetGroup: groupsBefore + 1,
  };
}

/**
 * Find the index of \K in a pattern, ignoring escaped backslashes
 */
function findUnescapedK(pattern: string): number {
  let i = 0;
  while (i < pattern.length - 1) {
    if (pattern[i] === "\\") {
      if (pattern[i + 1] === "K") {
        // Check if the backslash itself is escaped by counting preceding backslashes
        let backslashCount = 0;
        let j = i - 1;
        while (j >= 0 && pattern[j] === "\\") {
          backslashCount++;
          j--;
        }
        // If even number of preceding backslashes, this \K is not escaped
        if (backslashCount % 2 === 0) {
          return i;
        }
      }
      // Skip the escaped character
      i += 2;
    } else {
      i++;
    }
  }
  return -1;
}

/**
 * Count the number of capturing groups in a regex pattern.
 * Excludes non-capturing groups (?:...), lookahead (?=...), (?!...),
 * lookbehind (?<=...), (?<!...), and named groups (?<name>...) which we count.
 */
function countCapturingGroups(pattern: string): number {
  let count = 0;
  let i = 0;

  while (i < pattern.length) {
    if (pattern[i] === "\\") {
      // Skip escaped character
      i += 2;
      continue;
    }

    if (pattern[i] === "[") {
      // Skip character class
      i++;
      while (i < pattern.length && pattern[i] !== "]") {
        if (pattern[i] === "\\") i++;
        i++;
      }
      i++; // Skip ]
      continue;
    }

    if (pattern[i] === "(") {
      if (i + 1 < pattern.length && pattern[i + 1] === "?") {
        // Check what kind of group
        if (i + 2 < pattern.length) {
          const nextChar = pattern[i + 2];
          if (nextChar === ":" || nextChar === "=" || nextChar === "!") {
            // Non-capturing or lookahead - don't count
            i++;
            continue;
          }
          if (nextChar === "<") {
            // Could be lookbehind (?<= or (?<! or named group (?<name>
            if (i + 3 < pattern.length) {
              const afterLt = pattern[i + 3];
              if (afterLt === "=" || afterLt === "!") {
                // Lookbehind - don't count
                i++;
                continue;
              }
              // Named group - count it
              count++;
              i++;
              continue;
            }
          }
        }
      } else {
        // Regular capturing group
        count++;
      }
    }
    i++;
  }

  return count;
}

/**
 * Convert replacement string syntax to JavaScript's String.replace format
 *
 * Conversions:
 * - $0 and ${0} -> $& (full match)
 * - $name -> $<name> (named capture groups)
 * - ${name} -> $<name> (braced named capture groups)
 * - Preserves $1, $2, etc. for numbered groups
 */
export function convertReplacement(replacement: string): string {
  // First, convert $0 and ${0} to $& (use $$& to produce literal $& in output)
  let result = replacement.replace(/\$\{0\}|\$0(?![0-9])/g, "$$&");

  // Convert ${name} to $<name> for non-numeric names
  result = result.replace(/\$\{([^0-9}][^}]*)\}/g, "$$<$1>");

  // Convert $name to $<name> for non-numeric names (not followed by > which would already be converted)
  // Match $name where name starts with letter or underscore and contains word chars
  result = result.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)(?![>0-9])/g, "$$<$1>");

  return result;
}

/**
 * Convert Basic Regular Expression (BRE) to JavaScript regex
 *
 * In BRE:
 * - \| is alternation (becomes | in JS)
 * - \( \) are groups (become ( ) in JS)
 * - \{ \} are quantifiers (kept as literals for simplicity)
 * - + ? | ( ) { } are literal (must be escaped in JS)
 */
function escapeRegexForBasicGrep(str: string): string {
  let result = "";
  let i = 0;

  while (i < str.length) {
    const char = str[i];

    if (char === "\\" && i + 1 < str.length) {
      const nextChar = str[i + 1];
      // BRE: \| becomes | (alternation)
      // BRE: \( \) become ( ) (grouping)
      if (nextChar === "|" || nextChar === "(" || nextChar === ")") {
        result += nextChar;
        i += 2;
        continue;
      } else if (nextChar === "{" || nextChar === "}") {
        // Keep as escaped for now (literal)
        result += `\\${nextChar}`;
        i += 2;
        continue;
      }
    }

    // Escape characters that are special in JavaScript regex but not in BRE
    if (
      char === "+" ||
      char === "?" ||
      char === "|" ||
      char === "(" ||
      char === ")" ||
      char === "{" ||
      char === "}"
    ) {
      result += `\\${char}`;
    } else {
      result += char;
    }
    i++;
  }

  return result;
}
