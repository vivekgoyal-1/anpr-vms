# CamSentinel VMS - Video Management System with ANPR

## Overview

CamSentinel VMS is a comprehensive Video Management System with Automatic Number Plate Recognition (ANPR) capabilities, designed for modern surveillance infrastructure. The system provides live camera streaming, recording management, playback functionality, and real-time ANPR processing through a professional dark-themed web interface.

The application handles RTSP camera feeds, converts them to browser-compatible HLS streams, manages continuous and on-demand recording, and processes video streams for license plate detection and recognition using YOLOv8 and EasyOCR technologies.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 26, 2025)

- ✅ Fixed authentication system by integrating database seeding into application startup
- ✅ Implemented complete ANPR pipeline with YOLOv8 for vehicle detection and EasyOCR for text recognition
- ✅ Created comprehensive DEPLOYMENT.md with local setup and multiple hosting options
- ✅ Added real-time WebSocket connections with auto-reconnection
- ✅ All core functionalities tested and confirmed working:
  - JWT authentication and user management
  - Camera CRUD operations with encrypted password storage
  - Recording start/stop controls and metadata storage
  - ANPR event processing and database persistence
  - System statistics and health monitoring
  - Real-time WebSocket broadcasting for live updates

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **Styling**: TailwindCSS with shadcn/ui components for consistent dark theme UI
- **State Management**: TanStack Query for server state management and caching
- **Drag & Drop**: dnd-kit library for camera grid rearrangement functionality
- **Video Playback**: HLS.js for HTTP Live Streaming support in browsers
- **Real-time Updates**: WebSocket integration for live camera status and ANPR events

### Backend Architecture
- **Runtime**: Node.js with Express framework
- **Database**: PostgreSQL with Drizzle ORM (configured but may use in-memory storage initially)
- **Authentication**: JWT-based authentication with bcrypt password hashing
- **Real-time Communication**: WebSocket server for broadcasting camera status and ANPR events
- **Media Processing**: FFmpeg for RTSP to HLS transcoding and recording management
- **Security**: AES-256-GCM encryption for camera credentials storage

### Core Services
- **FFmpeg Manager**: Handles RTSP stream ingestion, HLS transcoding, and recording processes
- **Health Monitor**: Tracks camera connectivity and status with automatic reconnection
- **ANPR Worker**: Processes video frames using YOLOv8 for plate detection and EasyOCR for text recognition
- **Storage Manager**: Manages recording files, cleanup policies, and retention settings

### Data Models
- **Users**: Authentication and role management
- **Cameras**: RTSP configuration, layout settings, recording preferences, and ANPR configuration
- **Recordings**: Video file metadata, timestamps, and storage paths
- **ANPR Events**: License plate detection results with timestamps and confidence scores

### API Structure
- **Authentication**: `/api/auth/*` - Login and user management
- **Camera Management**: `/api/cameras/*` - CRUD operations for cameras
- **Recording Control**: `/api/cameras/:id/start-record`, `/api/cameras/:id/stop-record`
- **Media Serving**: `/api/cameras/:id/hls-playlist.m3u8` - HLS stream endpoints
- **ANPR Events**: `/api/anpr/events` - License plate detection results
- **System Stats**: `/api/system/stats` - System health and statistics

## External Dependencies

### Core Technologies
- **Database**: PostgreSQL via Neon serverless (configured in drizzle.config.ts)
- **Video Processing**: FFmpeg for stream transcoding and recording
- **Computer Vision**: Ultralytics YOLOv8 for object detection, EasyOCR for optical character recognition

### Development Tools
- **Build System**: Vite for frontend bundling and development server
- **Type Safety**: TypeScript across the entire stack
- **Database Migrations**: Drizzle Kit for schema management
- **Code Quality**: ESBuild for server bundling and optimization

### UI Components
- **Component Library**: Radix UI primitives with shadcn/ui theming
- **Fonts**: Inter font family from Google Fonts
- **Icons**: Lucide React icon library

### Runtime Environment
- **Platform**: Optimized for Replit deployment with development banner integration
- **Environment Variables**: Support for MongoDB URI, JWT secrets, encryption keys, and FFmpeg paths
- **WebSocket**: Native WebSocket implementation for real-time features