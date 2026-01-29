export type ElementType =
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text';

export interface Point {
  x: number;
  y: number;
}

// Binding for connecting arrows/lines to shapes
export interface Binding {
  elementId: string;
  focus: number; // -1 to 1, position along the edge
  gap: number;   // distance from shape edge
}

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'hachure' | 'solid' | 'cross-hatch' | 'none';
  strokeWidth: number;
  roughness: number;
  opacity: number;
  seed: number; // For consistent rough.js rendering
}

export interface RectangleElement extends BaseElement {
  type: 'rectangle';
}

export interface EllipseElement extends BaseElement {
  type: 'ellipse';
}

export interface DiamondElement extends BaseElement {
  type: 'diamond';
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: Point[]; // Relative to x, y
  startBinding: Binding | null;
  endBinding: Binding | null;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  points: Point[];
  startArrowhead: 'arrow' | 'bar' | 'dot' | null;
  endArrowhead: 'arrow' | 'bar' | 'dot' | null;
  startBinding: Binding | null;
  endBinding: Binding | null;
}

export interface FreedrawElement extends BaseElement {
  type: 'freedraw';
  points: Point[];
  pressures?: number[];
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
}

export type DrawElement =
  | RectangleElement
  | EllipseElement
  | DiamondElement
  | LineElement
  | ArrowElement
  | FreedrawElement
  | TextElement;

// Default values for new elements
export const defaultElementProps = {
  angle: 0,
  strokeColor: '#1e293b',
  backgroundColor: '#e0f2fe',
  fillStyle: 'hachure' as const,
  strokeWidth: 2,
  roughness: 1,
  opacity: 1,
};

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for non-secure contexts
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function createElement(
  type: ElementType,
  x: number,
  y: number,
  overrides: Partial<DrawElement> = {}
): DrawElement {
  const base: BaseElement = {
    id: generateId(),
    type,
    x,
    y,
    width: 0,
    height: 0,
    seed: Math.floor(Math.random() * 2 ** 31),
    ...defaultElementProps,
    ...overrides,
  };

  switch (type) {
    case 'line':
    case 'arrow':
      return {
        ...base,
        type,
        points: [{ x: 0, y: 0 }],
        startBinding: null,
        endBinding: null,
        ...(type === 'arrow' && { startArrowhead: null, endArrowhead: 'arrow' }),
      } as LineElement | ArrowElement;

    case 'freedraw':
      return {
        ...base,
        type: 'freedraw',
        points: [],
      } as FreedrawElement;

    case 'text':
      return {
        ...base,
        type: 'text',
        text: '',
        fontSize: 20,
        fontFamily: 'Virgil',
        textAlign: 'left',
      } as TextElement;

    default:
      return base as DrawElement;
  }
}
