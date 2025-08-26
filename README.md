# CamSentinel VMS - Video Management System with ANPR

A comprehensive Video Management System (VMS) with Automatic Number Plate Recognition (ANPR) capabilities, built for modern surveillance infrastructure.

## Features

### 🎥 **Video Management**
- **Live Camera Streaming**: Real-time RTSP to HLS transcoding for browser compatibility
- **Multi-Camera Dashboard**: Configurable 2x2, 3x3, 4x4 grid layouts with drag-and-drop
- **Recording Management**: Server-side continuous and on-demand recording with MP4/HLS formats
- **Playback System**: Seekable timeline with date/time filtering
- **Snapshot Capture**: On-demand image capture from live streams

### 🚗 **ANPR (Automatic Number Plate Recognition)**
- **YOLOv8 Integration**: Advanced plate detection using Ultralytics YOLOv8
- **EasyOCR Processing**: Accurate text recognition with confidence scoring
- **Real-time Events**: Live plate detection with WebSocket notifications
- **Configurable Sampling**: Adjustable frame sampling and confidence thresholds

### 🔧 **System Management**
- **Camera Health Monitoring**: Real-time status tracking and auto-reconnection
- **Storage Management**: Automated cleanup with configurable retention policies
- **User Authentication**: JWT-based security with encrypted credential storage
- **WebSocket Integration**: Real-time updates for camera status and ANPR events

### 🎨 **Modern Interface**
- **Dark Theme**: Professional surveillance-grade UI
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Indicators**: Live status dots, recording badges, and event notifications
- **Keyboard Shortcuts**: Quick actions for power users (F for fullscreen, R for record toggle)

## Quick Start on Replit

### 1. **Environment Setup**
Create a `.env` file with the following variables:

```bash
# Database
MONGODB_URI=your_mongodb_connection_string

# Security
JWT_SECRET=your_jwt_secret_key_here
ENC_KEY=your_32_character_encryption_key!

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# ANPR
ANPR_ENABLED=true

# Optional
MEDIA_BASE_URL=http://localhost:5000
