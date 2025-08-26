import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cameras = pgTable("cameras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  rtspUrl: text("rtsp_url").notNull(),
  username: text("username"),
  encryptedPassword: text("encrypted_password"), // encrypted with AES-GCM
  location: text("location"),
  tags: text("tags").array(),
  enabledProtocols: jsonb("enabled_protocols").default({ hls: true, webrtc: false }),
  layout: jsonb("layout").default({ row: 0, col: 0, size: 1 }),
  recording: jsonb("recording").default({ 
    mode: "off", 
    segmentSeconds: 6, 
    retainDays: 7 
  }),
  anpr: jsonb("anpr").default({ 
    enabled: false, 
    sampleEveryNthFrame: 5,
    confidenceThreshold: 0.8
  }),
  status: text("status").default("offline"), // online, offline, error, reconnecting
  lastSeen: timestamp("last_seen"),
  metadata: jsonb("metadata"), // fps, bitrate, resolution
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recordings = pgTable("recordings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cameraId: varchar("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  path: text("path").notNull(),
  durationSec: integer("duration_sec"),
  sizeBytes: integer("size_bytes"),
  format: text("format").default("hls"), // hls, mp4
  metadata: jsonb("metadata"), // resolution, fps, etc
  createdAt: timestamp("created_at").defaultNow(),
});

export const anprEvents = pgTable("anpr_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cameraId: varchar("camera_id").notNull().references(() => cameras.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp").notNull(),
  plate: text("plate").notNull(),
  confidence: real("confidence").notNull(),
  snapshotPath: text("snapshot_path"),
  bbox: jsonb("bbox"), // bounding box coordinates
  metadata: jsonb("metadata"), // additional detection data
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  passwordHash: true,
  role: true,
});

export const insertCameraSchema = createInsertSchema(cameras).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  lastSeen: true,
  encryptedPassword: true,
}).extend({
  password: z.string().optional(),
});

export const insertRecordingSchema = createInsertSchema(recordings).omit({
  id: true,
  createdAt: true,
});

export const insertAnprEventSchema = createInsertSchema(anprEvents).omit({
  id: true,
  createdAt: true,
});

// Update schemas
export const updateCameraSchema = insertCameraSchema.partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Camera = typeof cameras.$inferSelect;
export type InsertCamera = z.infer<typeof insertCameraSchema>;
export type UpdateCamera = z.infer<typeof updateCameraSchema>;

export type Recording = typeof recordings.$inferSelect;
export type InsertRecording = z.infer<typeof insertRecordingSchema>;

export type AnprEvent = typeof anprEvents.$inferSelect;
export type InsertAnprEvent = z.infer<typeof insertAnprEventSchema>;

// API Response types
export type CameraWithStats = Camera & {
  recordingCount: number;
  anprEventCount: number;
  isRecording: boolean;
};

export type CameraStatus = {
  id: string;
  status: string;
  fps?: number;
  bitrate?: number;
  resolution?: string;
  lastError?: string;
};

export type SystemStats = {
  totalCameras: number;
  activeCameras: number;
  activeRecordings: number;
  todayAnprEvents: number;
  storageUsed: number;
  storageTotal: number;
};
