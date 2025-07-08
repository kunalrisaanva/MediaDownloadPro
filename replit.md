# VideoGrab - Video Downloader Application

## Overview

VideoGrab is a modern full-stack video downloader application that allows users to download videos from various platforms including YouTube, TikTok, Instagram, and Pinterest. The application features a React frontend with shadcn/ui components and an Express.js backend with PostgreSQL database support.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Comprehensive shadcn/ui component library including forms, dialogs, toasts, and more
- **Theme Support**: Built-in dark/light mode with system preference detection

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Video Processing**: yt-dlp integration for video extraction and download
- **Development**: Vite middleware for hot module replacement in development
- **API Design**: RESTful API endpoints for video analysis and download management

### Data Storage
- **Database**: PostgreSQL (configured for Neon serverless)
- **ORM**: Drizzle ORM with schema-first approach
- **Storage Strategy**: In-memory storage implementation with interface for future database integration
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

## Key Components

### Database Schema
- **Users Table**: User authentication and management
- **Downloads Table**: Track download requests, status, and metadata
- **Video Info Table**: Cache video metadata to avoid redundant API calls

### Video Processing Pipeline
1. **URL Analysis**: Platform detection and video metadata extraction
2. **Quality Selection**: Multiple quality options available for download
3. **Download Management**: Asynchronous download processing with status tracking
4. **File Delivery**: Secure file serving with cleanup mechanisms

### UI Components
- **Download Form**: URL input with platform detection and video preview
- **Video Preview**: Display video metadata with quality selection
- **Download Progress**: Real-time download status with progress indicators
- **Download History**: User's download history with re-download capabilities
- **Platform Support**: Visual platform indicators and supported features

## Data Flow

1. **User Input**: User pastes video URL into the download form
2. **Platform Detection**: Backend analyzes URL to determine platform (YouTube, TikTok, etc.)
3. **Video Analysis**: yt-dlp extracts video metadata including available qualities
4. **Quality Selection**: User selects preferred quality and format
5. **Download Initiation**: Backend starts download process and returns download ID
6. **Progress Tracking**: Frontend polls backend for download progress updates
7. **File Delivery**: Completed downloads are served to user with cleanup

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **drizzle-orm**: Type-safe database operations
- **yt-dlp**: Video downloading and metadata extraction (external binary)
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing

### UI Dependencies
- **@radix-ui/***: Headless UI components for accessibility
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **lucide-react**: Icon library
- **react-icons**: Additional platform-specific icons

## Deployment Strategy

### Development
- **Hot Reload**: Vite middleware integrated with Express server
- **TypeScript**: Full TypeScript support across frontend and backend
- **Error Handling**: Runtime error overlay for development debugging

### Production
- **Build Process**: Vite builds frontend static assets
- **Server Bundle**: esbuild bundles backend for Node.js runtime
- **Static Serving**: Express serves built frontend assets
- **Database Migrations**: Drizzle migrations for schema changes

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **NODE_ENV**: Environment detection for development/production modes
- **REPL_ID**: Replit-specific configuration for development features

## Changelog

- July 08, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.