/**
 * Returns `raw` only if it is a safe app-internal redirect target:
 * a single-slash-rooted path with no scheme, host, control chars, or
 * backslash tricks. Otherwise null (caller falls back to /dashboard).
 */
export function safeInternalPath(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  // reject whitespace + ASCII control chars (NUL..US, DEL)
  if (/[\s\x00-\x1f\x7f]/.test(raw)) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  return raw;
}
