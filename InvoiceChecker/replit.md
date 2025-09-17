# Invoice Generator Application

## Overview

This is a full-stack invoice generator application built with React, Express.js, and PostgreSQL. The application allows users to create, manage, and preview professional VAT invoices with Polish localization. It features a modern UI built with shadcn/ui components and provides real-time invoice calculations including VAT summaries and totals.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React 18 with TypeScript and Vite for development tooling
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design tokens and CSS variables
- **State Management**: React Query (TanStack Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas

**Key Design Decisions**:
- Component-based architecture with reusable UI components
- TypeScript throughout for type safety
- Shared schema validation between client and server
- Responsive design with mobile-first approach

### Backend Architecture

**Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Validation**: Zod schemas shared between frontend and backend
- **API Design**: RESTful API with proper HTTP status codes
- **Development**: Hot reload with Vite integration in development mode

**Key Design Decisions**:
- Separation of concerns with distinct storage layer abstraction
- Memory storage implementation with interface for easy database migration
- Comprehensive error handling and logging middleware
- Type-safe API responses with proper validation

### Data Storage

**Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle migrations with version control
- **Data Modeling**: JSONB fields for flexible invoice item and party data
- **Connection**: Neon serverless adapter for scalable connections

**Storage Layer**:
- Abstract storage interface (`IStorage`) for database operations
- Current implementation uses in-memory storage for development
- Designed for easy migration to persistent PostgreSQL storage
- Support for CRUD operations on invoice entities

### Invoice Business Logic

**Calculations**: Real-time invoice calculations with VAT handling
- **Item Totals**: Automatic calculation of net, VAT, and gross amounts
- **VAT Summary**: Grouped calculations by VAT rate
- **Number Conversion**: Polish language number-to-words conversion
- **Currency Formatting**: Proper Polish zloty formatting

**Data Validation**: Comprehensive validation using Zod schemas
- **Invoice Items**: Quantity, unit price, VAT rate validation
- **Party Information**: Required fields for seller/buyer details
- **Business Rules**: VAT rate limits, required field validation

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, React Hook Form
- **Backend**: Express.js, Node.js with TypeScript support
- **Build Tools**: Vite, ESBuild for production builds

### Database and ORM
- **Database**: PostgreSQL via Neon serverless platform
- **ORM**: Drizzle ORM with Drizzle Kit for migrations
- **Validation**: Zod for schema validation and type inference

### UI and Styling
- **UI Components**: Radix UI primitives with shadcn/ui wrapper components
- **Styling**: Tailwind CSS with PostCSS processing
- **Icons**: Lucide React icon library
- **Animations**: Class Variance Authority for component variants

### Development and Tooling
- **TypeScript**: Full TypeScript support across client and server
- **Development**: Vite with hot reload and error overlays
- **Replit Integration**: Cartographer and dev banner plugins for Replit environment
- **Session Management**: Connect-pg-simple for PostgreSQL session storage

### Utility Libraries
- **Date Handling**: date-fns for date manipulation and formatting
- **State Management**: TanStack React Query for server state
- **Routing**: Wouter for lightweight routing
- **Carousel**: Embla Carousel for UI components
- **Command Palette**: cmdk for command interfaces