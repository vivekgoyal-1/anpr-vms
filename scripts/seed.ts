import { storage } from "../server/storage";
import bcrypt from "bcrypt";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  try {
    // Create demo admin user
    const existingUser = await storage.getUserByEmail("admin@camsentinel.com");
    if (!existingUser) {
      const passwordHash = await bcrypt.hash("admin123", 10);
      const adminUser = await storage.createUser({
        email: "admin@camsentinel.com",
        passwordHash,
        role: "admin",
      });
      console.log("✅ Created admin user:", adminUser.email);
    } else {
      console.log("ℹ️ Admin user already exists");
    }

    // Create demo cameras
    const existingCameras = await storage.getCameras();
    if (existingCameras.length === 0) {
      
      // Demo Camera 1 - Front Entrance
      const frontEntrance = await storage.createCamera({
        name: "Front Entrance",
        location: "Main Building",
        rtspUrl: "rtsp://demo:demo@192.168.1.100:554/stream1",
        username: "demo",
        tags: ["entrance", "main", "security"],
        enabledProtocols: { hls: true, webrtc: false },
        layout: { row: 0, col: 0, size: 1 },
        recording: {
          mode: "continuous",
          segmentSeconds: 6,
          retainDays: 7,
        },
        anpr: {
          enabled: true,
          sampleEveryNthFrame: 5,
          confidenceThreshold: 0.8,
        },
      });
      console.log("✅ Created camera:", frontEntrance.name);

      // Demo Camera 2 - Parking Lot
      const parkingLot = await storage.createCamera({
        name: "Parking Lot",
        location: "West Side",
        rtspUrl: "rtsp://demo:demo@192.168.1.101:554/stream1",
        username: "demo", 
        tags: ["parking", "vehicles", "security"],
        enabledProtocols: { hls: true, webrtc: false },
        layout: { row: 0, col: 1, size: 1 },
        recording: {
          mode: "manual",
          segmentSeconds: 6,
          retainDays: 7,
        },
        anpr: {
          enabled: true,
          sampleEveryNthFrame: 3,
          confidenceThreshold: 0.85,
        },
      });
      console.log("✅ Created camera:", parkingLot.name);

      // Demo Camera 3 - Side Gate
      const sideGate = await storage.createCamera({
        name: "Side Gate",
        location: "East Entrance",
        rtspUrl: "rtsp://demo:demo@192.168.1.102:554/stream1",
        username: "demo",
        tags: ["entrance", "side", "pedestrian"],
        enabledProtocols: { hls: true, webrtc: false },
        layout: { row: 0, col: 2, size: 1 },
        recording: {
          mode: "off",
          segmentSeconds: 6,
          retainDays: 7,
        },
        anpr: {
          enabled: false,
          sampleEveryNthFrame: 5,
          confidenceThreshold: 0.8,
        },
      });
      console.log("✅ Created camera:", sideGate.name);

      // Demo Camera 4 - Main Lobby
      const mainLobby = await storage.createCamera({
        name: "Main Lobby",
        location: "Ground Floor",
        rtspUrl: "rtsp://demo:demo@192.168.1.103:554/stream1",
        username: "demo",
        tags: ["lobby", "indoor", "monitoring"],
        enabledProtocols: { hls: true, webrtc: false },
        layout: { row: 1, col: 0, size: 1 },
        recording: {
          mode: "continuous",
          segmentSeconds: 6,
          retainDays: 14,
        },
        anpr: {
          enabled: false,
          sampleEveryNthFrame: 5,
          confidenceThreshold: 0.8,
        },
      });
      console.log("✅ Created camera:", mainLobby.name);

      // Create demo recordings
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const recording1 = await storage.createRecording({
        cameraId: frontEntrance.id,
        date: twoHoursAgo,
        startTime: twoHoursAgo,
        endTime: oneHourAgo,
        path: `/records/${frontEntrance.id}/${twoHoursAgo.toISOString().split('T')[0]}/recording_${twoHoursAgo.toISOString().replace(/[:.]/g, '-')}.mp4`,
        durationSec: 3600,
        sizeBytes: 1024 * 1024 * 150, // 150MB
        format: "mp4",
        metadata: { resolution: "1920x1080", fps: 25 },
      });
      console.log("✅ Created demo recording for:", frontEntrance.name);

      const recording2 = await storage.createRecording({
        cameraId: parkingLot.id,
        date: oneHourAgo,
        startTime: oneHourAgo,
        endTime: now,
        path: `/records/${parkingLot.id}/${oneHourAgo.toISOString().split('T')[0]}/recording_${oneHourAgo.toISOString().replace(/[:.]/g, '-')}.mp4`,
        durationSec: 3600,
        sizeBytes: 1024 * 1024 * 180, // 180MB
        format: "mp4",
        metadata: { resolution: "1920x1080", fps: 30 },
      });
      console.log("✅ Created demo recording for:", parkingLot.name);

      // Create demo ANPR events
      const anprEvents = [
        { plate: "ABC-1234", confidence: 0.95, cameraId: frontEntrance.id },
        { plate: "XYZ-7890", confidence: 0.92, cameraId: parkingLot.id },
        { plate: "DEF-4567", confidence: 0.88, cameraId: frontEntrance.id },
        { plate: "GHI-2345", confidence: 0.91, cameraId: parkingLot.id },
        { plate: "JKL-8901", confidence: 0.89, cameraId: frontEntrance.id },
      ];

      for (let i = 0; i < anprEvents.length; i++) {
        const event = anprEvents[i];
        const eventTime = new Date(now.getTime() - (i * 15 * 60 * 1000)); // Every 15 minutes

        await storage.createAnprEvent({
          cameraId: event.cameraId,
          timestamp: eventTime,
          plate: event.plate,
          confidence: event.confidence,
          snapshotPath: `/snapshots/${event.cameraId}/snapshot_${eventTime.toISOString().replace(/[:.]/g, '-')}.jpg`,
          bbox: {
            x: Math.floor(Math.random() * 500),
            y: Math.floor(Math.random() * 300),
            width: 120 + Math.floor(Math.random() * 50),
            height: 45 + Math.floor(Math.random() * 20),
          },
          metadata: {
            model: "YOLOv8n",
            version: "8.0.0",
            processingTime: Math.floor(Math.random() * 500) + 100,
          },
        });
        console.log(`✅ Created ANPR event: ${event.plate}`);
      }

    } else {
      console.log("ℹ️ Demo cameras already exist");
    }

    console.log("🎉 Database seeded successfully!");
    console.log("\n📋 Demo Credentials:");
    console.log("Email: admin@camsentinel.com");
    console.log("Password: admin123");
    console.log("\n🎥 Demo Cameras:");
    console.log("- Front Entrance (ANPR enabled, continuous recording)");
    console.log("- Parking Lot (ANPR enabled, manual recording)");
    console.log("- Side Gate (ANPR disabled, no recording)");
    console.log("- Main Lobby (ANPR disabled, continuous recording)");
    console.log("\n📹 Demo Data:");
    console.log("- 2 sample recordings");
    console.log("- 5 ANPR events with various confidence levels");
    console.log("\n🚀 Ready to start! Run 'npm run dev' to launch the application.");

  } catch (error) {
    console.error("❌ Failed to seed database:", error);
    process.exit(1);
  }
}

// Run seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}

export { seedDatabase };
