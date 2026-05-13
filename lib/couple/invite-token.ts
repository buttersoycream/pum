import { randomBytes } from "node:crypto";

export function generateInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export const INVITE_EXPIRY_HOURS = 72;
