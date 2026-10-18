export type Identity = { id: string; approved: boolean; sessionId?: string; sessionStarted?: number };
export type PersonRecord = { id: string; name: string; username: string; connected: boolean; blocked: boolean; requested: boolean };
export type GroupRecord = { id: string; name: string; members: { person: PersonRecord; role: "Owner" | "Admin" | "Member" }[]; added: boolean; myRole: "Owner" | "Admin" | "Member" };
export type ConversationRecord = { id: string; kind: "direct" | "group"; title: string; username?: string; peerId?: string; message: string; unread: number; updatedAt: string; nextSeq: number };
export type MessageRecord = { id: string; conversationId: string; authorId: string; retryId: string; seq: number; text: string; deleted: boolean; createdAt: string; sender: PersonRecord };
export type Snapshot = {
  people: PersonRecord[];
  requests: { id: string; person: PersonRecord; age: string; direction: "incoming" | "outgoing" }[];
  groups: GroupRecord[];
  invitations: { id: string; name: string; invitedBy: string; status: "pending" | "accepted" | "declined" }[];
  blocked: PersonRecord[];
  conversations: ConversationRecord[];
  operator: boolean;
};
export class ServiceError extends Error {
  status: 400 | 401 | 403 | 404 | 409 | 429 | 503;
  code: string;
  constructor(status: ServiceError["status"], message: string, code = "REQUEST_FAILED") { super(message); this.status = status; this.code = code; }
}
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validId(value: unknown): asserts value is string { if (typeof value !== "string" || !uuidPattern.test(value)) throw new ServiceError(400, "Invalid identifier."); }
export function validText(value: unknown, max = 4000): asserts value is string { if (typeof value !== "string" || !value.trim() || [...value].length > max || value.includes("\u0000")) throw new ServiceError(400, `Enter between 1 and ${max} characters.`); }
