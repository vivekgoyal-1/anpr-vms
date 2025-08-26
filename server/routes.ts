import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { insertUserSchema, insertCameraSchema, updateCameraSchema } from "@shared/schema";
import { ffmpegManager } from "./services/ffmpegManager";
import { healthMonitor } from "./services/healthMonitor";
import { anprWorker } from "./services/anprWorker";
import { encryptCredentials, decryptCredentials } from "./utils/encryption";
import fs from "fs/promises";
import path from "path";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

// WebSocket clients
const wsClients = new Set<WebSocket>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
wss.on('connection', (ws) => {
  console.log(`New client connected. Total: ${wss.clients.size}`);

  ws.on('close', () => {
    console.log(`Client disconnected. Remaining: ${wss.clients.size}`);
  });
});


  // Broadcast to all WebSocket clients
  const broadcast = (event: string, data: any) => {
    const message = JSON.stringify({ event, data });
    wsClients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  };

  // JWT middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
     console.log('Authorization Header:', authHeader);
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      
      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({ email, passwordHash, role: 'user' });
      
      const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
      
      res.status(201).json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          role: user.role 
        } 
      });
    } catch (error) {
      res.status(400).json({ message: 'Registration failed' });
    }
  });

  // Camera routes
  app.get('/api/cameras', async (req, res) => {
    try {
      const cameras = await storage.getCameras();
      
      // Remove sensitive data from response
      const safeCameras = cameras.map(camera => ({
        ...camera,
        encryptedPassword: undefined,
        username: camera.username ? '[HIDDEN]' : null,
      }));
      
      res.json(safeCameras);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch cameras' });
    }
  });

  app.get('/api/cameras/:id', async (req, res) => {
    try {
      const camera = await storage.getCameraWithStats(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      res.json({
        ...camera,
        encryptedPassword: undefined,
        username: camera.username ? '[HIDDEN]' : null,
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch camera' });
    }
  });

  app.post('/api/cameras', async (req, res) => {
    try {
      const cameraData = insertCameraSchema.parse(req.body);
      
      // Encrypt password if provided
      let encryptedPassword = null;
      if (cameraData.password) {
        encryptedPassword = encryptCredentials(cameraData.password);
      }
      
      const { password, ...cameraWithoutPassword } = cameraData;
      const cameraToCreate: any = { ...cameraWithoutPassword };
      if (encryptedPassword) {
        cameraToCreate.encryptedPassword = encryptedPassword;
      }
      const camera = await storage.createCamera(cameraToCreate);
      
      // Start monitoring this camera
      healthMonitor.addCamera(camera.id);
      
      // Start FFmpeg pipeline if needed
      if (camera.enabledProtocols && typeof camera.enabledProtocols === 'object' && 'hls' in camera.enabledProtocols) {
        await ffmpegManager.startHLSStream(camera.id);
      }
      
      broadcast('camera-added', camera);
      
      res.status(201).json({
        ...camera,
        encryptedPassword: undefined,
        username: camera.username ? '[HIDDEN]' : null,
      });
    } catch (error) {
      res.status(400).json({ message: 'Failed to create camera' });
    }
  });

  app.put('/api/cameras/:id', async (req, res) => {
    try {
      const updates = updateCameraSchema.parse(req.body);
      
      // Handle password encryption
      let finalUpdates = updates;
      if (updates.password) {
        const encryptedPassword = encryptCredentials(updates.password);
        const { password, ...updatesWithoutPassword } = updates;
        finalUpdates = updatesWithoutPassword;
      }
      
      const camera = await storage.updateCamera(req.params.id, finalUpdates);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      // Restart streams if configuration changed
      if (updates.rtspUrl || updates.enabledProtocols) {
        await ffmpegManager.restartStream(camera.id);
      }
      
      broadcast('camera-updated', camera);
      
      res.json({
        ...camera,
        encryptedPassword: undefined,
        username: camera.username ? '[HIDDEN]' : null,
      });
    } catch (error) {
      res.status(400).json({ message: 'Failed to update camera' });
    }
  });

  app.delete('/api/cameras/:id', async (req, res) => {
    try {
      const success = await storage.deleteCamera(req.params.id);
      if (!success) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      // Stop monitoring and streams
      healthMonitor.removeCamera(req.params.id);
      await ffmpegManager.stopStream(req.params.id);
      
      broadcast('camera-deleted', { id: req.params.id });
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete camera' });
    }
  });

  // HLS stream endpoint
  app.get('/api/cameras/:id/hls-playlist.m3u8', async (req, res) => {
    try {
      const camera = await storage.getCamera(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      const playlistPath = path.join(process.cwd(), 'streams', req.params.id, 'live', 'index.m3u8');
      
      try {
        const playlist = await fs.readFile(playlistPath, 'utf-8');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(playlist);
      } catch (error) {
        res.status(404).json({ message: 'Stream not available' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to serve playlist' });
    }
  });

  // HLS segments
  app.get('/api/cameras/:id/hls/:segment', async (req, res) => {
    try {
      const segmentPath = path.join(process.cwd(), 'streams', req.params.id, 'live', req.params.segment);
      
      try {
        const segment = await fs.readFile(segmentPath);
        res.setHeader('Content-Type', 'video/mp2t');
        res.setHeader('Cache-Control', 'max-age=10');
        res.send(segment);
      } catch (error) {
        res.status(404).json({ message: 'Segment not found' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Failed to serve segment' });
    }
  });

  // Recording routes
  app.post('/api/cameras/:id/start-record', authenticateToken, async (req, res) => {
    try {
      const camera = await storage.getCamera(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      const recording = await ffmpegManager.startRecording(req.params.id);
      broadcast('recording-started', { cameraId: req.params.id, recording });
      
      res.json(recording);
    } catch (error) {
      res.status(500).json({ message: 'Failed to start recording' });
    }
  });

  app.post('/api/cameras/:id/stop-record', authenticateToken, async (req, res) => {
    try {
      const recording = await ffmpegManager.stopRecording(req.params.id);
      if (!recording) {
        return res.status(404).json({ message: 'No active recording found' });
      }
      
      broadcast('recording-stopped', { cameraId: req.params.id, recording });
      
      res.json(recording);
    } catch (error) {
      res.status(500).json({ message: 'Failed to stop recording' });
    }
  });

  app.get('/api/recordings', authenticateToken, async (req, res) => {
    try {
      const { cameraId, from, to } = req.query;
      const filters: any = {};
      
      if (cameraId) filters.cameraId = cameraId as string;
      if (from) filters.from = new Date(from as string);
      if (to) filters.to = new Date(to as string);
      
      const recordings = await storage.getRecordings(filters);
      res.json(recordings);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch recordings' });
    }
  });

  // Snapshot endpoint
  app.post('/api/cameras/:id/snapshot', authenticateToken, async (req, res) => {
    try {
      const camera = await storage.getCamera(req.params.id);
      if (!camera) {
        return res.status(404).json({ message: 'Camera not found' });
      }
      
      const snapshotPath = await ffmpegManager.takeSnapshot(req.params.id);
      res.json({ path: snapshotPath });
    } catch (error) {
      res.status(500).json({ message: 'Failed to take snapshot' });
    }
  });

  // ANPR routes
  app.get('/api/anpr/events', authenticateToken, async (req, res) => {
    try {
      const { cameraId, from, to, plate } = req.query;
      const filters: any = {};
      
      if (cameraId) filters.cameraId = cameraId as string;
      if (from) filters.from = new Date(from as string);
      if (to) filters.to = new Date(to as string);
      if (plate) filters.plate = plate as string;
      
      const events = await storage.getAnprEvents(filters);
      res.json(events);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch ANPR events' });
    }
  });

  app.post('/api/anpr/process', authenticateToken, async (req, res) => {
    try {
      const { cameraId } = req.body;
      if (!cameraId) {
        return res.status(400).json({ message: 'Camera ID required' });
      }

      // Trigger ANPR processing for a specific camera
      anprWorker.processCamera(cameraId);
      res.json({ message: 'ANPR processing initiated', cameraId });
    } catch (error) {
      res.status(500).json({ message: 'Failed to process ANPR' });
    }
  });

  // System stats
  app.get('/api/system/stats', authenticateToken, async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch system stats' });
    }
  });

  // Initialize services
  healthMonitor.on('camera-status', (data) => {
    broadcast('camera-status', data);
  });

  anprWorker.on('anpr-event', (data) => {
    broadcast('anpr-event', data);
  });

  return httpServer;
}
