import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const downloads = pgTable("downloads", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  duration: text("duration"),
  quality: text("quality").notNull(),
  fileSize: text("file_size"),
  downloadUrl: text("download_url"),
  status: text("status").notNull().default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const videoInfo = pgTable("video_info", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  platform: text("platform").notNull(),
  title: text("title").notNull(),
  thumbnail: text("thumbnail"),
  duration: text("duration"),
  views: text("views"),
  channelName: text("channel_name"),
  channelAvatar: text("channel_avatar"),
  availableQualities: text("available_qualities").array(),
  metadata: text("metadata"), // JSON string
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertDownloadSchema = createInsertSchema(downloads).pick({
  url: true,
  platform: true,
  title: true,
  thumbnail: true,
  duration: true,
  quality: true,
  fileSize: true,
  downloadUrl: true,
  status: true,
});

export const insertVideoInfoSchema = createInsertSchema(videoInfo).pick({
  url: true,
  platform: true,
  title: true,
  thumbnail: true,
  duration: true,
  views: true,
  channelName: true,
  channelAvatar: true,
  availableQualities: true,
  metadata: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Download = typeof downloads.$inferSelect;
export type InsertDownload = z.infer<typeof insertDownloadSchema>;
export type VideoInfo = typeof videoInfo.$inferSelect;
export type InsertVideoInfo = z.infer<typeof insertVideoInfoSchema>;
