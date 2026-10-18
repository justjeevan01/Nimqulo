import type { ImageProps } from "expo-image";
import type { Person } from "@/components/social/types";
export type GroupMember = { person: Person; role: "Owner" | "Admin" | "Member" };
export type Group = { id: string; name: string; avatar?: ImageProps["source"]; members: readonly GroupMember[]; membersAvailable?: boolean; added?: boolean; myRole?: "Owner"|"Admin"|"Member" };
export type Invitation = { id: string; name: string; invitedBy?: string; avatar?: ImageProps["source"]; status: "pending" | "accepted" | "declined"; age?: string };
