# Overview

ChatBook is a real-time chat application built with a full-stack TypeScript architecture. It enables users to create accounts, engage in one-on-one messaging, see online status indicators, and receive real-time notifications. The application features a modern, responsive UI with authentication, user profiles, and WebSocket-based real-time communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses React with TypeScript, built on Vite for fast development and bundling. The UI is constructed with shadcn/ui components built on Radix UI primitives, styled with Tailwind CSS using a custom design system with CSS variables for theming. The application uses Wouter for lightweight client-side routing and TanStack Query for server state management with caching and synchronization.

## Backend Architecture
The server is built with Express.js and TypeScript, following a modular structure with separate route handling, database operations, and WebSocket management. The application uses session-based authentication with secure HTTP-only cookies, stored in PostgreSQL via connect-pg-simple. Real-time features are powered by WebSocket connections that handle message delivery, typing indicators, and online status updates.

## Data Storage
PostgreSQL serves as the primary database, managed through Drizzle ORM for type-safe database operations. The schema includes users, messages, and sessions tables with proper foreign key relationships. Neon Database is used as the PostgreSQL provider, configured for serverless deployment. Database migrations are handled through Drizzle Kit.

## Authentication & Authorization  
Session-based authentication using express-session with PostgreSQL storage provides secure user management. Passwords are hashed using bcrypt with a salt rounds of 12. Session middleware protects API routes, and WebSocket connections are authenticated using session data. The system includes user registration with username availability checking and secure login/logout flows.

## Real-time Communication
WebSocket server implementation handles real-time messaging, typing indicators, and online presence. Connection state is tracked per user with automatic cleanup on disconnect. Message delivery includes read receipts and unread message counting. The system supports real-time user status updates and maintains connection persistence with reconnection logic.

# External Dependencies

- **Neon Database**: PostgreSQL-compatible serverless database for data storage
- **shadcn/ui**: Component library built on Radix UI for consistent, accessible UI components
- **Radix UI**: Headless UI primitives for building the component system
- **TanStack Query**: Server state management with caching, synchronization, and background updates
- **Tailwind CSS**: Utility-first CSS framework for styling with custom design tokens
- **Drizzle ORM**: Type-safe database toolkit for PostgreSQL operations and migrations
- **WebSocket (ws)**: Real-time bidirectional communication for chat features
- **bcrypt**: Password hashing library for secure authentication
- **express-session**: Session management middleware for user authentication
- **connect-pg-simple**: PostgreSQL session store for persistent session data
- **Wouter**: Lightweight client-side routing library
- **React Hook Form**: Form handling with validation and error management
- **Zod**: Schema validation for type-safe data parsing and validation