import { boolean, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

export const profiles = pgTable("nimqulo_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  username: text("username").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const preferences = pgTable("nimqulo_preferences", {
  userId: text("user_id").primaryKey(),
  appearance: text("appearance").notNull().default("System"),
  notifications: boolean("notifications").notNull().default(true),
  previews: boolean("previews").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const media = pgTable("nimqulo_media", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
