import "server-only";
import { createHash, randomBytes } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");

export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

// Invite codes go in links, so they only need to be unguessable, not typeable.
export const newInviteCode = () => randomToken(9);
