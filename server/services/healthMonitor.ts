import { EventEmitter } from "events";
import { storage } from "../storage";
import { ffmpegManager } from "./ffmpegManager";

class HealthMonitor extends EventEmitter {
  private monitoredCameras: Set<string> = new Set();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startMonitoring();
  }

  addCamera(cameraId: string): void {
    this.monitoredCameras.add(cameraId);
  }

  removeCamera(cameraId: string): void {
    this.monitoredCameras.delete(cameraId);
  }

  private startMonitoring(): void {
    // Check camera health every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkAllCameras();
    }, 30000);
  }

  private async checkAllCameras(): Promise<void> {
    for (const cameraId of this.monitoredCameras) {
      await this.checkCamera(cameraId);
    }
  }

  private async checkCamera(cameraId: string): Promise<void> {
    try {
      const camera = await storage.getCamera(cameraId);
      if (!camera) {
        this.monitoredCameras.delete(cameraId);
        return;
      }

      // Simple RTSP connectivity check
      const status = await this.probeRTSPStream(camera.rtspUrl, camera.username, camera.encryptedPassword);
      
      const lastStatus = camera.status;
      let newStatus = status.connected ? 'online' : 'offline';
      
      // Update camera status if changed
      if (lastStatus !== newStatus) {
        // Status updates not available in current schema - using events instead

        this.emit('camera-status', {
          id: cameraId,
          status: newStatus,
          ...status.metadata,
          lastError: status.error,
        });

        // Restart HLS stream if camera came back online
        if (newStatus === 'online' && lastStatus !== 'online') {
          ffmpegManager.startHLSStream(cameraId).catch(console.error);
        }
      }
    } catch (error) {
      console.error(`Health check failed for camera ${cameraId}:`, error);
    }
  }

  private async probeRTSPStream(rtspUrl: string, username?: string | null, encryptedPassword?: string | null): Promise<{
    connected: boolean;
    metadata?: any;
    error?: string;
  }> {
    // In a real implementation, this would use FFprobe or similar to check RTSP connectivity
    // For now, we'll simulate the check
    
    try {
      // Build authenticated URL if credentials provided
      let probeUrl = rtspUrl;
      if (username && encryptedPassword) {
        // Note: In real implementation, decrypt the password here
        const urlParts = new URL(rtspUrl);
        probeUrl = `${urlParts.protocol}//${username}:[ENCRYPTED]@${urlParts.host}${urlParts.pathname}${urlParts.search}`;
      }

      // Simulate probe - in real implementation, use child_process to run ffprobe
      const isReachable = await this.simulateNetworkCheck(rtspUrl);
      
      if (isReachable) {
        return {
          connected: true,
          metadata: {
            fps: 25,
            bitrate: 2000,
            resolution: '1920x1080',
          }
        };
      } else {
        return {
          connected: false,
          error: 'Stream unreachable',
        };
      }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async simulateNetworkCheck(rtspUrl: string): Promise<boolean> {
    // Simulate network connectivity check
    // In real implementation, this would parse the RTSP URL and attempt a connection
    try {
      const url = new URL(rtspUrl);
      // Simple heuristic: if it's localhost or 192.168.x.x, assume it's reachable
      return url.hostname === 'localhost' || url.hostname.startsWith('192.168.');
    } catch (error) {
      return false;
    }
  }

  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const healthMonitor = new HealthMonitor();
