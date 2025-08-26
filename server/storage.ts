import { type User, type InsertUser, type Camera, type InsertCamera, type UpdateCamera, type Recording, type InsertRecording, type AnprEvent, type InsertAnprEvent, type CameraWithStats, type SystemStats } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Cameras
  getCameras(): Promise<Camera[]>;
  getCamera(id: string): Promise<Camera | undefined>;
  getCameraWithStats(id: string): Promise<CameraWithStats | undefined>;
  createCamera(camera: InsertCamera): Promise<Camera>;
  updateCamera(id: string, updates: UpdateCamera): Promise<Camera | undefined>;
  deleteCamera(id: string): Promise<boolean>;

  // Recordings
  getRecordings(filters?: { cameraId?: string; from?: Date; to?: Date }): Promise<Recording[]>;
  getRecording(id: string): Promise<Recording | undefined>;
  createRecording(recording: InsertRecording): Promise<Recording>;
  updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined>;
  deleteRecording(id: string): Promise<boolean>;

  // ANPR Events
  getAnprEvents(filters?: { cameraId?: string; from?: Date; to?: Date; plate?: string }): Promise<AnprEvent[]>;
  createAnprEvent(event: InsertAnprEvent): Promise<AnprEvent>;
  getAnprEventsCount(cameraId: string, since?: Date): Promise<number>;

  // System Stats
  getSystemStats(): Promise<SystemStats>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private cameras: Map<string, Camera> = new Map();
  private recordings: Map<string, Recording> = new Map();
  private anprEvents: Map<string, AnprEvent> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      role: insertUser.role || "user",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Cameras
  async getCameras(): Promise<Camera[]> {
    return Array.from(this.cameras.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getCamera(id: string): Promise<Camera | undefined> {
    return this.cameras.get(id);
  }

  async getCameraWithStats(id: string): Promise<CameraWithStats | undefined> {
    const camera = this.cameras.get(id);
    if (!camera) return undefined;

    const recordingCount = Array.from(this.recordings.values())
      .filter(r => r.cameraId === id).length;
    
    const anprEventCount = Array.from(this.anprEvents.values())
      .filter(e => e.cameraId === id).length;

    const isRecording = Array.from(this.recordings.values())
      .some(r => r.cameraId === id && !r.endTime);

    return {
      ...camera,
      recordingCount,
      anprEventCount,
      isRecording,
    };
  }

  async createCamera(insertCamera: InsertCamera): Promise<Camera> {
    const id = randomUUID();
    const camera: Camera = {
      ...insertCamera,
      id,
      status: "offline",
      lastSeen: null,
      metadata: null,
      encryptedPassword: null, // Will be set by encryption service
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cameras.set(id, camera);
    return camera;
  }

  async updateCamera(id: string, updates: UpdateCamera): Promise<Camera | undefined> {
    const camera = this.cameras.get(id);
    if (!camera) return undefined;

    const updatedCamera: Camera = {
      ...camera,
      ...updates,
      updatedAt: new Date(),
    };
    this.cameras.set(id, updatedCamera);
    return updatedCamera;
  }

  async deleteCamera(id: string): Promise<boolean> {
    return this.cameras.delete(id);
  }

  // Recordings
  async getRecordings(filters?: { cameraId?: string; from?: Date; to?: Date }): Promise<Recording[]> {
    let recordings = Array.from(this.recordings.values());

    if (filters?.cameraId) {
      recordings = recordings.filter(r => r.cameraId === filters.cameraId);
    }

    if (filters?.from) {
      recordings = recordings.filter(r => r.startTime >= filters.from!);
    }

    if (filters?.to) {
      recordings = recordings.filter(r => r.startTime <= filters.to!);
    }

    return recordings.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  async getRecording(id: string): Promise<Recording | undefined> {
    return this.recordings.get(id);
  }

  async createRecording(insertRecording: InsertRecording): Promise<Recording> {
    const id = randomUUID();
    const recording: Recording = {
      ...insertRecording,
      id,
      metadata: insertRecording.metadata || {},
      createdAt: new Date(),
    };
    this.recordings.set(id, recording);
    return recording;
  }

  async updateRecording(id: string, updates: Partial<Recording>): Promise<Recording | undefined> {
    const recording = this.recordings.get(id);
    if (!recording) return undefined;

    const updatedRecording: Recording = {
      ...recording,
      ...updates,
    };
    this.recordings.set(id, updatedRecording);
    return updatedRecording;
  }

  async deleteRecording(id: string): Promise<boolean> {
    return this.recordings.delete(id);
  }

  // ANPR Events
  async getAnprEvents(filters?: { cameraId?: string; from?: Date; to?: Date; plate?: string }): Promise<AnprEvent[]> {
    let events = Array.from(this.anprEvents.values());

    if (filters?.cameraId) {
      events = events.filter(e => e.cameraId === filters.cameraId);
    }

    if (filters?.from) {
      events = events.filter(e => e.timestamp >= filters.from!);
    }

    if (filters?.to) {
      events = events.filter(e => e.timestamp <= filters.to!);
    }

    if (filters?.plate) {
      events = events.filter(e => e.plate.toLowerCase().includes(filters.plate!.toLowerCase()));
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createAnprEvent(insertEvent: InsertAnprEvent): Promise<AnprEvent> {
    const id = randomUUID();
    const event: AnprEvent = {
      ...insertEvent,
      id,
      metadata: insertEvent.metadata || {},
      bbox: insertEvent.bbox || {},
      createdAt: new Date(),
    };
    this.anprEvents.set(id, event);
    return event;
  }

  async getAnprEventsCount(cameraId: string, since?: Date): Promise<number> {
    const events = Array.from(this.anprEvents.values())
      .filter(e => e.cameraId === cameraId);
    
    if (since) {
      return events.filter(e => e.timestamp >= since).length;
    }
    
    return events.length;
  }

  // System Stats
  async getSystemStats(): Promise<SystemStats> {
    const totalCameras = this.cameras.size;
    const activeCameras = Array.from(this.cameras.values())
      .filter(c => c.status === "online").length;
    
    const activeRecordings = Array.from(this.recordings.values())
      .filter(r => !r.endTime).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayAnprEvents = Array.from(this.anprEvents.values())
      .filter(e => e.timestamp >= today).length;

    return {
      totalCameras,
      activeCameras,
      activeRecordings,
      todayAnprEvents,
      storageUsed: 0, // Would calculate from file system
      storageTotal: 0, // Would get from system
    };
  }
}

export const storage = new MemStorage();
