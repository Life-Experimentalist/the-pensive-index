# Component System Documentation

## 🎨 Component Architecture Overview

The Pensive Index uses a layered component architecture with reusable UI elements and specialized interaction components.

### Component Hierarchy

```mermaid
graph TB
    subgraph "Application Layer"
        APP1[Admin Dashboard]
        APP2[Pathway Creator]
        APP3[Story Search]
    end

    subgraph "Specialized Components"
        SPEC1[Drag-Drop System]
        SPEC2[Form Components]
        SPEC3[Data Visualization]
    end

    subgraph "UI Component Library"
        UI1[Button]
        UI2[Card]
        UI3[Input]
        UI4[Modal]
        UI5[Table]
    end

    subgraph "Utilities Layer"
        UTIL1[Style Utilities]
        UTIL2[Type Definitions]
        UTIL3[Helper Functions]
    end

    APP1 --> SPEC1
    APP1 --> SPEC2
    APP2 --> SPEC1
    APP2 --> UI1
    APP3 --> SPEC3
    APP3 --> UI3

    SPEC1 --> UI1
    SPEC1 --> UI2
    SPEC2 --> UI3
    SPEC2 --> UI1
    SPEC3 --> UI2
    SPEC3 --> UI5

    UI1 --> UTIL1
    UI2 --> UTIL1
    UI3 --> UTIL1
    UI4 --> UTIL2
    UI5 --> UTIL3

    style APP1 fill:#e3f2fd
    style APP2 fill:#e3f2fd
    style APP3 fill:#e3f2fd
    style SPEC1 fill:#fff3e0
    style SPEC2 fill:#fff3e0
    style SPEC3 fill:#fff3e0
    style UI1 fill:#f3e5f5
    style UI2 fill:#f3e5f5
    style UI3 fill:#f3e5f5
    style UI4 fill:#f3e5f5
    style UI5 fill:#f3e5f5
    style UTIL1 fill:#e8f5e8
    style UTIL2 fill:#e8f5e8
    style UTIL3 fill:#e8f5e8
```

### Layer Descriptions:

**Application Layer**:
- **Admin Dashboard**: Management interface for content creators
- **Pathway Creator**: Main user interface for building story pathways
- **Story Search**: Discovery interface for finding existing stories

**Specialized Components**:
- **Drag-Drop System**: Interactive pathway building components
- **Form Components**: Complex form handling and validation
- **Data Visualization**: Charts, graphs, and data display components

**UI Component Library**:
- **Button**: Clickable actions with various styles and states
- **Card**: Container component for grouping related content
- **Input**: Form input fields with validation and error states
- **Modal**: Overlay dialogs and popups
- **Table**: Data display with sorting and filtering

**Utilities Layer**:
- **Style Utilities**: Tailwind CSS utilities and design tokens
- **Type Definitions**: TypeScript interfaces and component props
- **Helper Functions**: Common functionality shared across components

## 🧩 UI Component Library

### Base Components Structure

```mermaid
graph LR
    subgraph "src/components/ui/"
        subgraph "Form Elements"
            INPUT[Input.tsx]
            BUTTON[Button.tsx]
            SELECT[Select.tsx]
            CHECKBOX[Checkbox.tsx]
        end

        subgraph "Layout Elements"
            CARD[Card.tsx]
            CONTAINER[Container.tsx]
            GRID[Grid.tsx]
            STACK[Stack.tsx]
        end

        subgraph "Feedback Elements"
            ALERT[Alert.tsx]
            TOAST[Toast.tsx]
            LOADING[Loading.tsx]
            PROGRESS[Progress.tsx]
        end

        subgraph "Navigation Elements"
            TABS[Tabs.tsx]
            BREADCRUMB[Breadcrumb.tsx]
            PAGINATION[Pagination.tsx]
            MENU[Menu.tsx]
        end
    end

    style INPUT fill:#e1f5fe
    style BUTTON fill:#e1f5fe
    style CARD fill:#f3e5f5
    style CONTAINER fill:#f3e5f5
    style ALERT fill:#fff3e0
    style TOAST fill:#fff3e0
    style TABS fill:#e8f5e8
    style MENU fill:#e8f5e8
```

### Component Categories:

**Form Elements**:
- **Input**: Text inputs, textareas, with validation states
- **Button**: Primary, secondary, ghost, and icon button variants
- **Select**: Dropdown selection with search and multi-select
- **Checkbox**: Boolean inputs with indeterminate state

**Layout Elements**:
- **Card**: Flexible container with header, body, and footer sections
- **Container**: Responsive content containers with max-width constraints
- **Grid**: CSS Grid wrapper for complex layouts
- **Stack**: Flexbox utility for vertical/horizontal spacing

**Feedback Elements**:
- **Alert**: Status messages for success, error, warning, info
- **Toast**: Temporary notifications that appear and disappear
- **Loading**: Spinner and skeleton loading states
- **Progress**: Progress bars and completion indicators

**Navigation Elements**:
- **Tabs**: Tab interface for organizing related content
- **Breadcrumb**: Navigation trail showing current location
- **Pagination**: Page navigation for large data sets
- **Menu**: Dropdown and context menus

## 🎯 Drag-Drop System

### Drag-Drop Component Architecture

```mermaid
graph TB
    subgraph "src/components/drag-drop/"
        DND_CONTEXT[DragDropContext.tsx]
        DRAGGABLE[DraggableItem.tsx]
        DROPPABLE[DroppableZone.tsx]
        DND_INDEX[index.ts]
    end

    subgraph "dnd-kit Library"
        SENSORS[Sensors]
        COLLISION[Collision Detection]
        MODIFIERS[Drag Modifiers]
    end

    subgraph "Application Usage"
        PATHWAY[Pathway Builder]
        TAG_SELECTOR[Tag Selector]
        PLOT_BUILDER[Plot Builder]
    end

    DND_CONTEXT --> SENSORS
    DND_CONTEXT --> COLLISION
    DRAGGABLE --> MODIFIERS
    DROPPABLE --> COLLISION

    PATHWAY --> DND_CONTEXT
    PATHWAY --> DRAGGABLE
    PATHWAY --> DROPPABLE

    TAG_SELECTOR --> DRAGGABLE
    PLOT_BUILDER --> DROPPABLE

    style DND_CONTEXT fill:#e1f5fe
    style DRAGGABLE fill:#e1f5fe
    style DROPPABLE fill:#e1f5fe
    style SENSORS fill:#f3e5f5
    style COLLISION fill:#f3e5f5
    style MODIFIERS fill:#f3e5f5
    style PATHWAY fill:#fff3e0
    style TAG_SELECTOR fill:#fff3e0
    style PLOT_BUILDER fill:#fff3e0
```

### Drag-Drop Component Details:

**Core Components**:
- **DragDropContext**: Provides drag-and-drop functionality to child components
- **DraggableItem**: Makes individual elements draggable (tags, plot blocks)
- **DroppableZone**: Defines areas where draggable items can be dropped
- **index.ts**: Exports all drag-drop components and utilities

**dnd-kit Integration**:
- **Sensors**: Handle touch, mouse, and keyboard interactions
- **Collision Detection**: Determines valid drop targets during drag
- **Drag Modifiers**: Customize drag behavior (snap to grid, constraints)

**Application Usage**:
- **Pathway Builder**: Main interface for creating story pathways
- **Tag Selector**: Draggable tag selection interface
- **Plot Builder**: Constructing plot block hierarchies

### Interaction Flow

```mermaid
sequenceDiagram
    participant User
    participant Draggable as DraggableItem
    participant Context as DragDropContext
    participant Droppable as DroppableZone
    participant App as Application

    User->>Draggable: Start drag
    Draggable->>Context: onDragStart event
    Context->>Context: Update drag state
    Context->>Droppable: Highlight valid targets

    User->>User: Drag over zones
    Context->>Droppable: onDragOver events
    Droppable->>Droppable: Show drop indicators

    User->>Droppable: Drop item
    Droppable->>Context: onDragEnd event
    Context->>App: Update application state
    App->>App: Validate drop action
    App-->>User: Visual feedback
```

### Interaction Flow Steps:

1. **Start Drag**: User begins dragging an item
2. **Drag State**: Context tracks drag state and highlights targets
3. **Drag Over**: Visual feedback as user moves over drop zones
4. **Drop Action**: Item is dropped, triggering validation and state updates
5. **Visual Feedback**: Application provides confirmation of successful action

## 📱 Responsive Design System

### Breakpoint Strategy

```mermaid
graph TB
    subgraph "Device Categories"
        MOBILE[Mobile<br/>< 768px]
        TABLET[Tablet<br/>768px - 1024px]
        DESKTOP[Desktop<br/>> 1024px]
    end

    subgraph "Interaction Methods"
        TOUCH[Touch Interface]
        MOUSE[Mouse/Trackpad]
        KEYBOARD[Keyboard Navigation]
    end

    subgraph "Component Adaptations"
        MOBILE_COMP[Tap-to-Select]
        TABLET_COMP[Hybrid Interface]
        DESKTOP_COMP[Drag-and-Drop]
    end

    MOBILE --> TOUCH
    TABLET --> TOUCH
    TABLET --> MOUSE
    DESKTOP --> MOUSE
    DESKTOP --> KEYBOARD

    TOUCH --> MOBILE_COMP
    MOUSE --> DESKTOP_COMP
    KEYBOARD --> DESKTOP_COMP

    style MOBILE fill:#e1f5fe
    style TABLET fill:#f3e5f5
    style DESKTOP fill:#fff3e0
    style TOUCH fill:#ffebee
    style MOUSE fill:#e8f5e8
    style KEYBOARD fill:#e8f5e8
```

### Responsive Behavior:

**Mobile (< 768px)**:
- **Touch Interface**: Optimized for finger navigation
- **Tap-to-Select**: Alternative to drag-and-drop for pathway building
- **Simplified Layouts**: Single-column layouts with clear touch targets

**Tablet (768px - 1024px)**:
- **Hybrid Interface**: Supports both touch and mouse interactions
- **Adaptive Layouts**: Two-column layouts that work for both orientations
- **Enhanced Touch Targets**: Larger interactive areas for comfort

**Desktop (> 1024px)**:
- **Drag-and-Drop**: Full drag-and-drop functionality for complex interactions
- **Multi-Panel Layout**: Three-panel interface (selection, pathway, output)
- **Keyboard Navigation**: Full keyboard accessibility support

## 🎨 Design System Integration

### Tailwind CSS Integration

```mermaid
graph LR
    subgraph "Design Tokens"
        COLORS[Color Palette]
        SPACING[Spacing Scale]
        TYPOGRAPHY[Typography Scale]
        SHADOWS[Shadow System]
    end

    subgraph "Component Variants"
        PRIMARY[Primary Styles]
        SECONDARY[Secondary Styles]
        GHOST[Ghost Styles]
        DANGER[Danger Styles]
    end

    subgraph "State Management"
        DEFAULT[Default State]
        HOVER[Hover State]
        ACTIVE[Active State]
        DISABLED[Disabled State]
    end

    subgraph "Responsive Utils"
        MOBILE_UTILS[Mobile Utilities]
        TABLET_UTILS[Tablet Utilities]
        DESKTOP_UTILS[Desktop Utilities]
    end

    COLORS --> PRIMARY
    COLORS --> SECONDARY
    COLORS --> GHOST
    COLORS --> DANGER

    PRIMARY --> DEFAULT
    PRIMARY --> HOVER
    PRIMARY --> ACTIVE
    PRIMARY --> DISABLED

    DEFAULT --> MOBILE_UTILS
    HOVER --> TABLET_UTILS
    ACTIVE --> DESKTOP_UTILS

    style COLORS fill:#e1f5fe
    style SPACING fill:#e1f5fe
    style TYPOGRAPHY fill:#e1f5fe
    style SHADOWS fill:#e1f5fe
    style PRIMARY fill:#f3e5f5
    style SECONDARY fill:#f3e5f5
    style GHOST fill:#f3e5f5
    style DANGER fill:#f3e5f5
    style DEFAULT fill:#fff3e0
    style HOVER fill:#fff3e0
    style ACTIVE fill:#fff3e0
    style DISABLED fill:#fff3e0
```

### Design System Elements:

**Design Tokens**:
- **Color Palette**: Consistent colors across all components
- **Spacing Scale**: Uniform spacing using Tailwind's scale
- **Typography Scale**: Text sizes and line heights for hierarchy
- **Shadow System**: Depth and elevation through shadows

**Component Variants**:
- **Primary**: Main call-to-action styling
- **Secondary**: Supporting action styling
- **Ghost**: Minimal styling for subtle actions
- **Danger**: Warning and destructive action styling

**State Management**:
- **Default**: Base component appearance
- **Hover**: Enhanced appearance on hover/focus
- **Active**: Pressed or selected state appearance
- **Disabled**: Non-interactive state with reduced opacity

**Responsive Utilities**:
- **Mobile**: Touch-optimized spacing and sizing
- **Tablet**: Balanced approach for mixed interactions
- **Desktop**: Precise controls for mouse interactions

## 🔄 Component Development Workflow

### Component Creation Process

```mermaid
graph TD
    START[New Component Need] --> DESIGN[Design System Check]
    DESIGN --> EXISTS{Existing Component?}
    EXISTS -->|Yes| EXTEND[Extend Existing]
    EXISTS -->|No| CREATE[Create New Component]

    EXTEND --> VARIANT[Add Variant]
    CREATE --> INTERFACE[Define TypeScript Interface]

    VARIANT --> IMPLEMENT[Implement Changes]
    INTERFACE --> IMPLEMENT

    IMPLEMENT --> STYLES[Apply Tailwind Styles]
    STYLES --> RESPONSIVE[Add Responsive Behavior]
    RESPONSIVE --> ACCESSIBILITY[Ensure Accessibility]
    ACCESSIBILITY --> TESTING[Write Component Tests]
    TESTING --> DOCS[Update Documentation]
    DOCS --> REVIEW[Code Review]
    REVIEW --> DEPLOY[Deploy to Library]

    style START fill:#e8f5e8
    style DESIGN fill:#fff3e0
    style CREATE fill:#e1f5fe
    style IMPLEMENT fill:#f3e5f5
    style TESTING fill:#ffebee
    style DEPLOY fill:#e8f5e8
```

### Development Workflow Steps:

1. **Component Need**: Identify requirement for new component or enhancement
2. **Design System Check**: Verify alignment with design system principles
3. **Existing Component**: Evaluate if existing component can be extended
4. **Create/Extend**: Either create new component or add variant to existing
5. **Implementation**: Code the component with proper TypeScript interfaces
6. **Styling**: Apply Tailwind CSS with consistent design tokens
7. **Responsive**: Ensure component works across all device sizes
8. **Accessibility**: Implement ARIA attributes and keyboard navigation
9. **Testing**: Write unit tests and interaction tests
10. **Documentation**: Update component documentation and examples
11. **Review**: Code review for quality and consistency
12. **Deploy**: Add to component library and update exports

## 📚 Component Usage Examples

### Button Component Usage

```typescript
// Basic button usage
<Button variant="primary" size="md">
  Save Changes
</Button>

// Button with icon and loading state
<Button
  variant="secondary"
  size="lg"
  icon={<SaveIcon />}
  loading={isSubmitting}
  disabled={!formValid}
>
  Submit Form
</Button>

// Ghost button for subtle actions
<Button variant="ghost" size="sm" onClick={handleCancel}>
  Cancel
</Button>
```

### Card Component Usage

```typescript
// Basic card with content
<Card>
  <Card.Header>
    <h3>Fandom Management</h3>
  </Card.Header>
  <Card.Body>
    <p>Manage your fandoms and their settings.</p>
  </Card.Body>
  <Card.Footer>
    <Button variant="primary">Open Manager</Button>
  </Card.Footer>
</Card>

// Card with custom styling
<Card variant="elevated" padding="lg">
  <div className="space-y-4">
    <h2>Story Pathway</h2>
    <PathwayBuilder />
  </div>
</Card>
```

### Drag-Drop Usage

```typescript
// Drag-drop context setup
<DragDropContext onDragEnd={handleDragEnd}>
  <div className="flex gap-4">
    {/* Draggable items */}
    <div>
      {tags.map(tag => (
        <DraggableItem key={tag.id} id={tag.id} data={tag}>
          <TagCard tag={tag} />
        </DraggableItem>
      ))}
    </div>

    {/* Drop zone */}
    <DroppableZone id="pathway" className="min-h-96 border-2 border-dashed">
      <PathwayVisualization items={pathwayItems} />
    </DroppableZone>
  </div>
</DragDropContext>
```

This component system provides a solid foundation for building The Pensive Index user interface, ensuring consistency, accessibility, and maintainability across all application features.