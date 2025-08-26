export interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  username?: string;
  location?: string;
  tags?: string[];
  enabledProtocols?: {
    hls: boolean;
    webrtc: boolean;
  };
  layout?: {
    row: number;
    col: number;
    size: number;
  };
  recording?: {
    mode: 'off' | 'manual' | 'continuous';
    segmentSeconds: number;
    retainDays: number;
  };
  anpr?: {
    enabled: boolean;
    sampleEveryNthFrame: number;
    confidenceThreshold: number;
  };
  status: string;
  lastSeen?: Date;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface CameraWithStats extends Camera {
  recordingCount: number;
  anprEventCount: number;
  isRecording: boolean;
}

export interface Recording {
  id: string;
  cameraId: string;
  date: Date;
  startTime: Date;
  endTime?: Date;
  path: string;
  durationSec?: number;
  sizeBytes?: number;
  format: string;
  metadata?: any;
  createdAt: Date;
}

export interface AnprEvent {
  id: string;
  cameraId: string;
  timestamp: Date;
  plate: string;
  confidence: number;
  snapshotPath?: string;
  bbox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  metadata?: any;
  createdAt: Date;
}

export interface CameraStatus {
  id: string;
  status: string;
  fps?: number;
  bitrate?: number;
  resolution?: string;
  lastError?: string;
}

export interface SystemStats {
  totalCameras: number;
  activeCameras: number;
  activeRecordings: number;
  todayAnprEvents: number;
  storageUsed: number;
  storageTotal: number;
}
