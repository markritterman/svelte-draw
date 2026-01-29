# excali-svelte

A Svelte-native drawing tool inspired by Excalidraw.

## Project Overview

**Goal:** Build an internal drawing/whiteboard library in Svelte, reusing proven math utilities from Excalidraw while creating our own UI and state management.

**Name:** `excali-svelte` (internal use, may rename if open-sourced)

**License consideration:** Excalidraw is MIT licensed, so copying/adapting math utilities is fine with attribution.

---

## Architecture Decisions

### What We're Reusing

Copy and adapt these pure TypeScript files from Excalidraw's `packages/math/src/`:

| File | Purpose |
|------|---------|
| `angle.ts` | Angle normalization, radians/degrees |
| `curve.ts` | Bezier curves, cubic splines |
| `line.ts` | Line intersection, point-to-line distance |
| `point.ts` | Vector ops, distance, rotate |
| `polygon.ts` | Point-in-polygon, convex hull |
| `range.ts` | 1D range overlap |
| `segment.ts` | Line segment math |
| `triangle.ts` | Barycentric coords, containment |
| `vector.ts` | 2D vector operations |
| `ga.ts` | 2D projective geometric algebra (from bivector.net) |

From `packages/element/src/`:

| File | Purpose |
|------|---------|
| `bounds.ts` | Element bounding boxes |
| `collision.ts` | Hit testing |
| `distance.ts` | Point-to-element distance |

**Note:** The geometric algebra in `ga.ts` originates from [bivector.net](https://bivector.net) and their 2D PGA implementation.

### What We're Building Fresh

- UI components (Svelte)
- State management (Svelte stores)
- Action/command system
- Rendering pipeline (using Rough.js)
- History/undo system
- Event handling

### What We're NOT Doing

- Wrapping React inside Svelte
- Trying to stay in sync with Excalidraw upstream
- Building a 1:1 clone

---

## Element Schema

Start with Excalidraw-compatible format for easy importing, with room to extend.

```typescript
// types/element.ts

interface BaseElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'solid' | 'hachure' | 'cross-hatch';
  strokeWidth: number;
  roughness: number;
  opacity: number;
  seed: number;
  groupIds: string[];
  locked: boolean;
}

interface RectangleElement extends BaseElement {
  type: 'rectangle';
  roundness: { type: number; value?: number } | null;
}

interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

interface DiamondElement extends BaseElement {
  type: 'diamond';
}

interface LinearElement extends BaseElement {
  type: 'line' | 'arrow';
  points: [number, number][];
  startBinding: Binding | null;
  endBinding: Binding | null;
  startArrowhead: Arrowhead | null;
  endArrowhead: Arrowhead | null;
}

interface FreedrawElement extends BaseElement {
  type: 'freedraw';
  points: [number, number][];
  pressures: number[];
}

interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: number;
  textAlign: 'left' | 'center' | 'right';
  verticalAlign: 'top' | 'middle' | 'bottom';
  containerId: string | null;
}

interface ImageElement extends BaseElement {
  type: 'image';
  fileId: string;
  scale: [number, number];
}

type Element = 
  | RectangleElement 
  | EllipseElement 
  | DiamondElement 
  | LinearElement 
  | FreedrawElement 
  | TextElement 
  | ImageElement;
```

---

## Document Format

```typescript
interface Document {
  type: 'excali-svelte';
  version: 1;
  source: 'excalidraw' | 'native';
  elements: Element[];
  appState?: {
    viewBackgroundColor: string;
    gridSize: number | null;
  };
  files?: Record<string, BinaryFile>;
}
```

---

## Svelte 5 State Management

Using Svelte 5 runes for reactive state. Shared state lives in `.svelte.ts` files.

```typescript
// state/canvas.svelte.ts

// Core state
let elements = $state<Element[]>([]);
let selectedIds = $state<Set<string>>(new Set());
let tool = $state<Tool>('select');
let camera = $state({ x: 0, y: 0, zoom: 1 });

// App state
let appState = $state({
  viewBackgroundColor: '#ffffff',
  gridSize: null as number | null,
  theme: 'light' as 'light' | 'dark',
});

// Derived state
const selectedElements = $derived(
  elements.filter(el => selectedIds.has(el.id))
);

const visibleElements = $derived(
  elements.filter(el => isInViewport(el, camera))
);

// History
let history = $state<HistoryState>({
  undoStack: [],
  redoStack: [],
});

// Export as a single reactive object for easy imports
export function createCanvasState() {
  return {
    get elements() { return elements; },
    set elements(v) { elements = v; },

    get selectedIds() { return selectedIds; },
    set selectedIds(v) { selectedIds = v; },

    get tool() { return tool; },
    set tool(v) { tool = v; },

    get camera() { return camera; },
    set camera(v) { camera = v; },

    get appState() { return appState; },
    set appState(v) { appState = v; },

    get selectedElements() { return selectedElements; },
    get visibleElements() { return visibleElements; },

    get history() { return history; },
    set history(v) { history = v; },
  };
}

// Singleton instance
export const canvasState = createCanvasState();
```

### Using State in Components

```svelte
<!-- Canvas.svelte -->
<script lang="ts">
  import { canvasState } from '../state/canvas.svelte';

  // Reactive access
  $effect(() => {
    // Runs when visibleElements changes
    renderElements(canvasState.visibleElements);
  });

  function selectElement(id: string) {
    canvasState.selectedIds = new Set([...canvasState.selectedIds, id]);
  }
</script>
```

### Alternative: Class-based State

```typescript
// state/canvas.svelte.ts

class CanvasState {
  elements = $state<Element[]>([]);
  selectedIds = $state<Set<string>>(new Set());
  tool = $state<Tool>('select');
  camera = $state({ x: 0, y: 0, zoom: 1 });

  appState = $state({
    viewBackgroundColor: '#ffffff',
    gridSize: null as number | null,
    theme: 'light' as 'light' | 'dark',
  });

  history = $state<HistoryState>({
    undoStack: [],
    redoStack: [],
  });

  // Derived state as getters
  get selectedElements() {
    return this.elements.filter(el => this.selectedIds.has(el.id));
  }

  get visibleElements() {
    return this.elements.filter(el => isInViewport(el, this.camera));
  }

  // Methods for mutations
  selectElement(id: string) {
    this.selectedIds = new Set([...this.selectedIds, id]);
  }

  deselectAll() {
    this.selectedIds = new Set();
  }

  addElement(element: Element) {
    this.elements = [...this.elements, element];
  }

  updateElement(id: string, updates: Partial<Element>) {
    this.elements = this.elements.map(el =>
      el.id === id ? { ...el, ...updates } : el
    );
  }

  deleteElements(ids: Set<string>) {
    this.elements = this.elements.filter(el => !ids.has(el.id));
  }
}

export const canvasState = new CanvasState();
```

```typescript
// types/tools.ts
type Tool = 
  | 'select'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'image'
  | 'eraser'
  | 'hand';
```

---

## Library Import Support

Support importing from Excalidraw's community libraries.

```typescript
// lib/import.ts

interface ExcalidrawLibrary {
  type: 'excalidrawlib';
  version: 2;
  libraryItems: {
    status: 'published' | 'unpublished';
    id: string;
    elements: Element[];
    name?: string;
  }[];
}

export function importExcalidrawLibrary(json: ExcalidrawLibrary): LibraryItem[] {
  return json.libraryItems.map(item => ({
    id: item.id,
    name: item.name ?? 'Untitled',
    elements: item.elements,
    source: 'excalidraw',
  }));
}

export function importExcalidrawFile(json: any): Document {
  return {
    type: 'excali-svelte',
    version: 1,
    source: 'excalidraw',
    elements: json.elements,
    appState: json.appState,
    files: json.files,
  };
}
```

---

## Rendering

Use Rough.js for hand-drawn aesthetic (same as Excalidraw).

```typescript
// lib/render.ts
import rough from 'roughjs';

export function renderElement(
  rc: RoughCanvas,
  ctx: CanvasRenderingContext2D,
  element: Element
) {
  switch (element.type) {
    case 'rectangle':
      renderRectangle(rc, element);
      break;
    case 'ellipse':
      renderEllipse(rc, element);
      break;
    // ...
  }
}

function renderRectangle(rc: RoughCanvas, el: RectangleElement) {
  rc.rectangle(el.x, el.y, el.width, el.height, {
    seed: el.seed,
    roughness: el.roughness,
    stroke: el.strokeColor,
    fill: el.backgroundColor,
    fillStyle: el.fillStyle,
    strokeWidth: el.strokeWidth,
  });
}
```

---

## Project Structure

```
excali-svelte/
├── src/
│   ├── lib/
│   │   ├── math/              # Copied/adapted from Excalidraw
│   │   │   ├── angle.ts
│   │   │   ├── curve.ts
│   │   │   ├── ga.ts
│   │   │   ├── line.ts
│   │   │   ├── point.ts
│   │   │   ├── polygon.ts
│   │   │   ├── segment.ts
│   │   │   ├── triangle.ts
│   │   │   └── vector.ts
│   │   ├── element/
│   │   │   ├── bounds.ts
│   │   │   ├── collision.ts
│   │   │   └── distance.ts
│   │   ├── render/
│   │   │   ├── canvas.ts
│   │   │   └── elements.ts
│   │   ├── import/
│   │   │   ├── excalidraw.ts
│   │   │   └── library.ts
│   │   ├── history/
│   │   │   └── history.ts
│   │   └── utils.ts           # cn() helper for tailwind-merge
│   ├── state/                 # Svelte 5 runes-based state (.svelte.ts)
│   │   ├── canvas.svelte.ts
│   │   ├── tools.svelte.ts
│   │   └── history.svelte.ts
│   ├── components/
│   │   ├── ui/                # shadcn-svelte components
│   │   │   ├── button/
│   │   │   ├── dropdown-menu/
│   │   │   ├── popover/
│   │   │   ├── tooltip/
│   │   │   ├── separator/
│   │   │   └── slider/
│   │   ├── Canvas.svelte      # Main drawing canvas
│   │   ├── Toolbar.svelte     # Top toolbar
│   │   ├── Sidebar.svelte     # Left tool palette
│   │   ├── PropertiesPanel.svelte
│   │   └── Library.svelte
│   ├── types/
│   │   ├── element.ts
│   │   ├── document.ts
│   │   └── tools.ts
│   ├── App.svelte
│   ├── main.ts                # Entry point
│   └── app.css                # Global styles + Tailwind
├── index.html
├── package.json
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── tailwind.config.ts
└── README.md
```

**Notes:**
- Files with `.svelte.ts` extension can use Svelte 5 runes outside of components
- `src/components/ui/` contains shadcn-svelte components (added via CLI)
- No SvelteKit - just Vite + Svelte for simplicity

---

## Dependencies

Using **Vite + Svelte** (not SvelteKit) since this is a single-page canvas app with no routing or SSR needs.

```json
{
  "dependencies": {
    "roughjs": "^4.6.6",
    "bits-ui": "^1.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@sveltejs/vite-plugin-svelte": "^5.0.0",
    "svelte": "^5.16.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

```bash
# Create project
npm create vite@latest excali-svelte -- --template svelte-ts

# Install dependencies
npm install

# Dev server
npm run dev
```

**UI Components:** Using [shadcn-svelte](https://shadcn-svelte.com/) for toolbar, sidebar, dialogs, and menus.

```bash
# Initialize shadcn-svelte
npx shadcn-svelte@latest init

# Add components as needed
npx shadcn-svelte@latest add button dropdown-menu popover tooltip slider
```

**Why not SvelteKit?**
- Single-page app with no routing
- SSR doesn't benefit canvas rendering
- File save/load is client-side
- Simpler build setup

**Requirements:**
- Node.js 18+
- Use `.svelte.ts` extension for files using runes outside components

---

## Milestones

### Phase 1: Foundation
- [ ] Set up Vite + Svelte 5 project
- [ ] Configure Tailwind CSS 4 + shadcn-svelte
- [ ] Copy math utilities from Excalidraw
- [ ] Define element types
- [ ] Set up runes-based state management
- [ ] Canvas component with pan/zoom

### Phase 2: Drawing
- [ ] Rough.js integration
- [ ] Toolbar UI with shadcn-svelte
- [ ] Rectangle, ellipse, diamond tools
- [ ] Line and arrow tools
- [ ] Freedraw tool
- [ ] Selection and multi-select

### Phase 3: Editing
- [ ] Move elements
- [ ] Resize elements
- [ ] Rotate elements
- [ ] Delete elements
- [ ] Undo/redo

### Phase 4: Polish
- [ ] Text tool
- [ ] Image support
- [ ] Export (PNG, SVG, JSON)
- [ ] Excalidraw file import
- [ ] Library import from libraries.excalidraw.com

### Phase 5: Extended
- [ ] Collaboration (optional)
- [ ] Custom library format
- [ ] Plugin system
- [ ] Mobile support

---

## Attribution

This project uses adapted math utilities from [Excalidraw](https://github.com/excalidraw/excalidraw) (MIT License).

The geometric algebra implementation originates from [bivector.net](https://bivector.net).

---

## Open Questions

1. **Open source?** — Decide before Phase 4 if releasing publicly
2. **Rename?** — If open sourcing, consider `durendal`, `gram`, or `slate` to avoid Excalidraw confusion
3. **Collaboration** — Build from scratch or integrate existing solution?
4. **Mobile** — Touch support priority?
