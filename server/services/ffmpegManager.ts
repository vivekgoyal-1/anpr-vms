import { spawn, ChildProcess } from "child_process";
import { storage } from "../storage";
import { decryptCredentials } from "../utils/encryption";
import fs from "fs/promises";
import path from "path";

class FFmpegManager {
  private streams: Map<string, ChildProcess> = new Map();
  private recordings: Map<string, { process: ChildProcess; recordingId: string }> = new Map();

  async startHLSStream(cameraId: string): Promise<void> {
    const camera = await storage.getCamera(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }

    // Stop existing stream if running
    await this.stopStream(cameraId);

    // Build RTSP URL with credentials
    let rtspUrl = camera.rtspUrl;
    if (camera.username && camera.encryptedPassword) {
      const password = decryptCredentials(camera.encryptedPassword);
      const urlParts = new URL(rtspUrl);
      rtspUrl = `${urlParts.protocol}//${camera.username}:${password}@${urlParts.host}${urlParts.pathname}${urlParts.search}`;
    }

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'streams', cameraId, 'live');
    await fs.mkdir(outputDir, { recursive: true });

    // FFmpeg command for HLS streaming
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-fflags', '+genpts',
      '-flags', '+global_header',
      '-vcodec', 'libx264',
      '-preset', 'ultrafast',
      '-tune', 'zerolatency',
      '-acodec', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+program_date_time',
      '-hls_segment_filename', path.join(outputDir, 'segment_%03d.ts'),
      path.join(outputDir, 'index.m3u8')
    ];

    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ffmpeg.stdout?.on('data', (data) => {
      console.log(`FFmpeg stdout [${cameraId}]:`, data.toString());
    });

    ffmpeg.stderr?.on('data', (data) => {
      console.log(`FFmpeg stderr [${cameraId}]:`, data.toString());
    });

    ffmpeg.on('error', (error) => {
      console.error(`FFmpeg error [${cameraId}]:`, error);
      this.streams.delete(cameraId);
      // Log error - status updates handled by health monitor
    });

    ffmpeg.on('exit', (code) => {
      console.log(`FFmpeg exited [${cameraId}] with code:`, code);
      this.streams.delete(cameraId);
      
      if (code !== 0) {
        // Auto-restart on failure (with backoff)
        setTimeout(() => {
          this.startHLSStream(cameraId).catch(console.error);
        }, 5000);
      }
    });

    this.streams.set(cameraId, ffmpeg);
    
    // Log successful start - status updates handled by health monitor
  }

  async stopStream(cameraId: string): Promise<void> {
    const stream = this.streams.get(cameraId);
    if (stream) {
      stream.kill('SIGTERM');
      this.streams.delete(cameraId);
      
      // Log successful stop - status updates handled by health monitor
    }
  }

  async restartStream(cameraId: string): Promise<void> {
    await this.stopStream(cameraId);
    await this.startHLSStream(cameraId);
  }

  async startRecording(cameraId: string): Promise<any> {
    const camera = await storage.getCamera(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }

    // Check if already recording
    if (this.recordings.has(cameraId)) {
      throw new Error(`Camera ${cameraId} is already recording`);
    }

    // Build RTSP URL with credentials
    let rtspUrl = camera.rtspUrl;
    if (camera.username && camera.encryptedPassword) {
      const password = decryptCredentials(camera.encryptedPassword);
      const urlParts = new URL(rtspUrl);
      rtspUrl = `${urlParts.protocol}//${camera.username}:${password}@${urlParts.host}${urlParts.pathname}${urlParts.search}`;
    }

    // Create recording entry
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const outputDir = path.join(process.cwd(), 'records', cameraId, dateStr);
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `recording_${now.toISOString().replace(/[:.]/g, '-')}.mp4`;
    const outputPath = path.join(outputDir, filename);

    const recording = await storage.createRecording({
      cameraId,
      date: now,
      startTime: now,
      endTime: null,
      path: outputPath,
      durationSec: null,
      sizeBytes: null,
      format: 'mp4',
      metadata: null,
    });

    // Start FFmpeg recording
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const args = [
      '-rtsp_transport', 'tcp',
      '-i', rtspUrl,
      '-c', 'copy',
      '-f', 'mp4',
      outputPath
    ];

    const ffmpeg = spawn(ffmpegPath, args, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    ffmpeg.on('error', (error) => {
      console.error(`Recording FFmpeg error [${cameraId}]:`, error);
      this.recordings.delete(cameraId);
    });

    ffmpeg.on('exit', (code) => {
      console.log(`Recording FFmpeg exited [${cameraId}] with code:`, code);
      this.recordings.delete(cameraId);
    });

    this.recordings.set(cameraId, { process: ffmpeg, recordingId: recording.id });
    
    return recording;
  }

  async stopRecording(cameraId: string): Promise<any> {
    const recordingInfo = this.recordings.get(cameraId);
    if (!recordingInfo) {
      return null;
    }

    const { process: ffmpeg, recordingId } = recordingInfo;
    
    // Stop the recording
    ffmpeg.kill('SIGTERM');
    this.recordings.delete(cameraId);

    // Update recording with end time and file stats
    const recording = await storage.getRecording(recordingId);
    if (recording) {
      const endTime = new Date();
      const durationSec = Math.floor((endTime.getTime() - recording.startTime.getTime()) / 1000);
      
      // Get file size
      let sizeBytes = 0;
      try {
        const stats = await fs.stat(recording.path);
        sizeBytes = stats.size;
      } catch (error) {
        console.error('Failed to get file stats:', error);
      }

      return await storage.updateRecording(recordingId, {
        endTime,
        durationSec,
        sizeBytes,
      });
    }

    return recording;
  }

  async takeSnapshot(cameraId: string): Promise<string> {
    const camera = await storage.getCamera(cameraId);
    if (!camera) {
      throw new Error(`Camera ${cameraId} not found`);
    }

    // Build RTSP URL with credentials
    let rtspUrl = camera.rtspUrl;
    if (camera.username && camera.encryptedPassword) {
      const password = decryptCredentials(camera.encryptedPassword);
      const urlParts = new URL(rtspUrl);
      rtspUrl = `${urlParts.protocol}//${camera.username}:${password}@${urlParts.host}${urlParts.pathname}${urlParts.search}`;
    }

    // Ensure snapshots directory exists
    const snapshotsDir = path.join(process.cwd(), 'snapshots', cameraId);
    await fs.mkdir(snapshotsDir, { recursive: true });

    const filename = `snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.jpg`;
    const outputPath = path.join(snapshotsDir, filename);

    return new Promise((resolve, reject) => {
      const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
      const args = [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-vframes', '1',
        '-y',
        outputPath
      ];

      const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      ffmpeg.on('error', reject);
      ffmpeg.on('exit', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }

  // Cleanup old recordings based on retention policy
  async cleanupOldRecordings(): Promise<void> {
    const cameras = await storage.getCameras();
    
    for (const camera of cameras) {
      const recording = camera.recording as any;
      const retainDays = recording?.retainDays || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retainDays);

      const oldRecordings = await storage.getRecordings({
        cameraId: camera.id,
        to: cutoffDate,
      });

      for (const recording of oldRecordings) {
        try {
          await fs.unlink(recording.path);
          await storage.deleteRecording(recording.id);
          console.log(`Deleted old recording: ${recording.path}`);
        } catch (error) {
          console.error(`Failed to delete recording ${recording.path}:`, error);
        }
      }
    }
  }
}

export const ffmpegManager = new FFmpegManager();

// Cleanup old recordings daily
setInterval(() => {
  ffmpegManager.cleanupOldRecordings().catch(console.error);
}, 24 * 60 * 60 * 1000);
