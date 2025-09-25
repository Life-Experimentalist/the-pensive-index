# The Pensive Index - Architecture Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Project Structure](#project-structure)
3. [Architecture Layers](#architecture-layers)
4. [Data Flow](#data-flow)
5. [API Structure](#api-structure)
6. [Component System](#component-system)
7. [Database Architecture](#database-architecture)
8. [Validation System](#validation-system)

## 🎯 Overview

The Pensive Index is a **library-first story discovery platform** for fanfiction that prioritizes finding existing tagged stories before generating new story prompts. It uses a modern, scalable architecture built with Next.js 13+ App Router.

## 🏗️ Project Structure

### High-Level Architecture

```mermaid
graph TB
    subgraph "Next.js Application"
        subgraph "app/ (Presentation Layer)"
            A1[API Routes]
            A2[Page Components]
            A3[Layout Components]
        end

        subgraph "src/ (Business Logic Layer)"
            S1[Components Library]
            S2[Database Layer]
            S3[Validation Engine]
            S4[Utilities]
        end
    end

    subgraph "External"
        DB[(Database)]
        CLIENT[Client Browser]
    end

    CLIENT --> A2
    CLIENT --> A1
    A1 --> S2
    A2 --> S1
    S2 --> DB
    S3 --> S2
    S1 --> S3

    style A1 fill:#e1f5fe
    style A2 fill:#e1f5fe
    style S1 fill:#f3e5f5
    style S2 fill:#f3e5f5
    style S3 fill:#f3e5f5
    style DB fill:#e8f5e8
```

### Elements Explanation:
- **app/ (Presentation Layer)**: Next.js App Router structure containing routes, API endpoints, and page layouts
- **src/ (Business Logic Layer)**: Core application logic, reusable components, and utilities
- **API Routes**: RESTful endpoints for data operations (CRUD operations for fandoms, tags, etc.)
- **Page Components**: React components that render full pages
- **Components Library**: Reusable UI components and drag-drop functionality
- **Database Layer**: Drizzle ORM schemas, queries, and database utilities
- **Validation Engine**: Zod schemas and business rule validation
- **Utilities**: Helper functions, error handling, and performance monitoring

## 🔄 Architecture Layers

### Layer Separation Model

```mermaid
graph TD
    subgraph "Presentation Layer (app/)"
        P1[Route Handlers]
        P2[Page Components]
        P3[API Endpoints]
    end

    subgraph "Business Logic Layer (src/)"
        B1[React Components]
        B2[Database Operations]
        B3[Validation Rules]
        B4[Utilities & Helpers]
    end

    subgraph "Data Layer"
        D1[(SQLite Database)]
        D2[Drizzle ORM]
    end

    P1 --> B1
    P2 --> B1
    P3 --> B2
    B1 --> B3
    B2 --> D2
    B3 --> B2
    D2 --> D1

    style P1 fill:#bbdefb
    style P2 fill:#bbdefb
    style P3 fill:#bbdefb
    style B1 fill:#e1bee7
    style B2 fill:#e1bee7
    style B3 fill:#e1bee7
    style B4 fill:#e1bee7
    style D1 fill:#c8e6c9
    style D2 fill:#c8e6c9
```

### Layer Responsibilities:

1. **Presentation Layer (app/)**:
   - **Route Handlers**: Handle HTTP requests and responses
   - **Page Components**: Render user interfaces
   - **API Endpoints**: Expose RESTful services

2. **Business Logic Layer (src/)**:
   - **React Components**: Reusable UI building blocks
   - **Database Operations**: Data access and manipulation
   - **Validation Rules**: Business logic and data validation
   - **Utilities & Helpers**: Common functionality and tools

3. **Data Layer**:
   - **SQLite Database**: Data storage
   - **Drizzle ORM**: Type-safe database queries

## 📊 Data Flow

### User Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App Router
    participant C as Components
    participant V as Validation
    participant D as Database
    participant DB as SQLite

    U->>A: HTTP Request
    A->>C: Load Components
    C->>V: Validate Input
    V->>D: Query Database
    D->>DB: Execute SQL
    DB-->>D: Return Data
    D-->>V: Validated Data
    V-->>C: Processed Data
    C-->>A: Rendered Component
    A-->>U: HTTP Response
```

### Flow Components:
- **User**: Browser client making requests
- **App Router**: Next.js routing system handling requests
- **Components**: React components from src/components
- **Validation**: Zod schemas and business rules from src/validation
- **Database**: Drizzle ORM operations from src/database
- **SQLite**: Actual database storage

## 🛣️ API Structure

### API Endpoint Organization

```mermaid
graph LR
    subgraph "API Routes (app/api/)"
        subgraph "v1/"
            V1F[fandoms/]
            V1T[tags/]
            V1P[plot-blocks/]
            V1TC[tag-classes/]
            V1V[validation/]
        end

        subgraph "Public APIs"
            PUB1[health/]
            PUB2[search/stories/]
        end

        subgraph "Legacy"
            LEG1[fandoms/]
        end
    end

    subgraph "Database Layer (src/lib/database/)"
        DB1[schema.ts]
        DB2[queries.ts]
        DB3[helpers.ts]
    end

    V1F --> DB1
    V1T --> DB2
    V1P --> DB3
    V1TC --> DB1
    V1V --> DB2

    style V1F fill:#ffecb3
    style V1T fill:#ffecb3
    style V1P fill:#ffecb3
    style V1TC fill:#ffecb3
    style V1V fill:#ffecb3
    style PUB1 fill:#e8f5e8
    style PUB2 fill:#e8f5e8
```

### API Endpoint Details:

**Versioned APIs (v1/)**:
- **fandoms/**: Manage fandoms (Harry Potter, Percy Jackson, etc.)
- **tags/**: Handle story tags (angst, fluff, time-travel)
- **plot-blocks/**: Manage plot elements (Goblin Inheritance, etc.)
- **tag-classes/**: Organize tags into validation groups
- **validation/**: Validate story pathway combinations

**Public APIs**:
- **health/**: System health checks
- **search/stories/**: Story discovery functionality

**Database Integration**:
- **schema.ts**: Drizzle ORM table definitions
- **queries.ts**: Complex query operations
- **helpers.ts**: CRUD operations and utilities

## 🎨 Component System

### Component Architecture

```mermaid
graph TB
    subgraph "UI Components (src/components/ui/)"
        UI1[Button]
        UI2[Card]
        UI3[Input]
    end

    subgraph "Drag-Drop System (src/components/drag-drop/)"
        DD1[DragDropContext]
        DD2[DraggableItem]
        DD3[DroppableZone]
    end

    subgraph "Application Pages (app/)"
        AP1[Admin Dashboard]
        AP2[Pathway Creator]
        AP3[Story Search]
    end

    AP1 --> UI1
    AP1 --> UI2
    AP2 --> DD1
    AP2 --> DD2
    AP2 --> DD3
    AP3 --> UI3

    DD1 --> UI1
    DD2 --> UI2
    DD3 --> UI3

    style UI1 fill:#fff3e0
    style UI2 fill:#fff3e0
    style UI3 fill:#fff3e0
    style DD1 fill:#fce4ec
    style DD2 fill:#fce4ec
    style DD3 fill:#fce4ec
    style AP1 fill:#e3f2fd
    style AP2 fill:#e3f2fd
    style AP3 fill:#e3f2fd
```

### Component Hierarchy:

**Base UI Components**:
- **Button**: Styled button with variants (primary, secondary, ghost)
- **Card**: Container component for content sections
- **Input**: Form input with validation states

**Drag-Drop Components**:
- **DragDropContext**: Provides drag-and-drop functionality using dnd-kit
- **DraggableItem**: Individual draggable elements (tags, plot blocks)
- **DroppableZone**: Areas where items can be dropped

**Application Pages**:
- **Admin Dashboard**: Management interface for content
- **Pathway Creator**: Main user interface for building story pathways
- **Story Search**: Discovery interface for finding existing stories

## 🗄️ Database Architecture

### Database Schema Structure

```mermaid
erDiagram
    FANDOMS ||--o{ TAGS : contains
    FANDOMS ||--o{ TAG_CLASSES : contains
    FANDOMS ||--o{ PLOT_BLOCKS : contains

    TAG_CLASSES ||--o{ TAGS : categorizes
    PLOT_BLOCKS ||--o{ PLOT_BLOCKS : parent_child
    PLOT_BLOCKS ||--o{ PLOT_BLOCK_CONDITIONS : has

    FANDOMS {
        string id PK
        string name
        string slug
        string description
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    TAGS {
        string id PK
        string name
        string fandom_id FK
        string description
        string category
        string tag_class_id FK
        json requires
        json enhances
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    TAG_CLASSES {
        string id PK
        string name
        string fandom_id FK
        string description
        json validation_rules
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PLOT_BLOCKS {
        string id PK
        string name
        string fandom_id FK
        string description
        string parent_id FK
        string category
        json metadata
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    PLOT_BLOCK_CONDITIONS {
        string id PK
        string plot_block_id FK
        string source_block_id FK
        string condition_type
        json condition_value
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
```

### Database Entity Descriptions:

**Core Entities**:
- **FANDOMS**: Top-level content categories (Harry Potter, Percy Jackson)
- **TAGS**: Story attributes and descriptors (angst, fluff, harry/hermione)
- **TAG_CLASSES**: Validation groups for tags (shipping, genres)
- **PLOT_BLOCKS**: Story structure elements (Goblin Inheritance, Time Travel)
- **PLOT_BLOCK_CONDITIONS**: Rules for plot block combinations

**Relationships**:
- Each fandom contains multiple tags, tag classes, and plot blocks
- Tag classes categorize and validate tag selections
- Plot blocks can have parent-child hierarchies
- Plot block conditions define interaction rules

## ✅ Validation System

### Validation Architecture

```mermaid
graph TB
    subgraph "Input Sources"
        I1[User Input]
        I2[API Requests]
        I3[Form Data]
    end

    subgraph "Validation Layer (src/validation/)"
        V1[Zod Schemas]
        V2[Business Rules]
        V3[Validation Engine]
    end

    subgraph "Database Layer (src/database/)"
        D1[Schema Validation]
        D2[Constraint Checks]
        D3[Data Integrity]
    end

    subgraph "Output"
        O1[Validated Data]
        O2[Error Messages]
        O3[Success Response]
    end

    I1 --> V1
    I2 --> V1
    I3 --> V1
    V1 --> V2
    V2 --> V3
    V3 --> D1
    D1 --> D2
    D2 --> D3
    D3 --> O1
    V3 --> O2
    O1 --> O3

    style V1 fill:#fff9c4
    style V2 fill:#fff9c4
    style V3 fill:#fff9c4
    style D1 fill:#f1f8e9
    style D2 fill:#f1f8e9
    style D3 fill:#f1f8e9
```

### Validation Components:

**Input Processing**:
- **User Input**: Form submissions and user interactions
- **API Requests**: HTTP request bodies and parameters
- **Form Data**: Structured form inputs

**Validation Layers**:
- **Zod Schemas**: Type-safe input validation and transformation
- **Business Rules**: Complex validation logic (tag conflicts, plot dependencies)
- **Validation Engine**: Orchestrates validation process

**Database Validation**:
- **Schema Validation**: Ensures data matches database schema
- **Constraint Checks**: Foreign key and unique constraint validation
- **Data Integrity**: Cross-table relationship validation

**Output Handling**:
- **Validated Data**: Clean, type-safe data ready for processing
- **Error Messages**: User-friendly validation error descriptions
- **Success Response**: Formatted successful operation results

## 🚀 Key Features

### Story Discovery Workflow

```mermaid
graph LR
    A[User Starts] --> B[Build Pathway]
    B --> C[Search Library]
    C --> D{Stories Found?}
    D -->|Yes| E[Show Matches]
    D -->|No| F[Generate Prompt]
    E --> G[User Selects]
    F --> H[Create New Story]
    G --> I[Read Story]
    H --> J[Write Story]

    style A fill:#e8f5e8
    style E fill:#fff3e0
    style F fill:#fce4ec
    style I fill:#e3f2fd
    style J fill:#f3e5f5
```

### Workflow Description:
1. **User Starts**: User accesses the platform
2. **Build Pathway**: Create story pathway using drag-drop or selection
3. **Search Library**: System searches existing tagged stories
4. **Decision Point**: Check if matching stories exist
5. **Show Matches**: Display relevant existing stories with scores
6. **Generate Prompt**: Create new story prompt highlighting novelty
7. **User Actions**: Either read existing stories or write new ones

This architecture ensures a clean separation of concerns, type safety throughout, and scalable development patterns for The Pensive Index platform.