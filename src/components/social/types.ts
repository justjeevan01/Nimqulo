import type { ImageProps } from "expo-image";
export type Person = { id: string; name: string; username: string; avatar?: ImageProps["source"]; sharedGroups?: number; connected?: boolean; online?: boolean; role?: string; memberSince?: string; blocked?: boolean; requested?: boolean };
export type ConnectionRequest = { id: string; person: Person; age: string; direction: "incoming" | "outgoing" };
