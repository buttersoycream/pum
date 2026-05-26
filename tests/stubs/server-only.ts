// Vitest stub for "server-only" — allows importing server modules in tests.
// In production, the real "server-only" package throws if imported outside RSC.
// This stub is a no-op so unit tests can import server-side modules without crashing.
export {};
