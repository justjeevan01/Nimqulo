export type Profile = { displayName: string; username: string };

export class ProfileConflict extends Error {}

export function parseProfile(value: unknown): Profile | undefined {
  if (!value || typeof value !== "object") return;
  const { displayName, username } = value as Record<string, unknown>;
  if (typeof displayName !== "string" || typeof username !== "string") return;
  const name = displayName.trim();
  if (!name || [...name].length > 60 || /[\u0000-\u001f\u007f]/.test(name)) return;
  if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) return;
  return { displayName: name, username: username.toLowerCase() };
}
