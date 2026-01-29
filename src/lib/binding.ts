import type { DrawElement, Point, Binding } from '../types/element';

const SNAP_DISTANCE = 15; // pixels to snap within

// Shapes that can be bound to
export function isBindableElement(element: DrawElement): boolean {
  return ['rectangle', 'ellipse', 'diamond'].includes(element.type);
}

// Get the center of an element
export function getElementCenter(element: DrawElement): Point {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

// Get binding point on element edge given a focus value (-1 to 1)
// and the direction from which the arrow approaches
// If fixedPoint is provided, use that normalized position instead of calculating from angle
export function getBindingPoint(
  element: DrawElement,
  fromPoint: Point,
  gap: number = 0,
  fixedPoint?: { x: number; y: number }
): Point {
  // If fixed point is provided, use it instead of dynamic calculation
  if (fixedPoint) {
    return getPointFromNormalized(element, fixedPoint, gap);
  }

  const center = getElementCenter(element);
  const angle = Math.atan2(fromPoint.y - center.y, fromPoint.x - center.x);

  switch (element.type) {
    case 'ellipse':
      return getEllipseBindingPoint(element, angle, gap);
    case 'diamond':
      return getDiamondBindingPoint(element, angle, gap);
    case 'rectangle':
    default:
      return getRectangleBindingPoint(element, angle, gap);
  }
}

function getRectangleBindingPoint(element: DrawElement, angle: number, gap: number): Point {
  const hw = element.width / 2;
  const hh = element.height / 2;
  const cx = element.x + hw;
  const cy = element.y + hh;

  // Determine which edge to bind to based on angle
  const tan = Math.tan(angle);
  let x: number, y: number;

  if (Math.abs(Math.cos(angle)) * hh > Math.abs(Math.sin(angle)) * hw) {
    // Left or right edge
    x = Math.cos(angle) > 0 ? hw : -hw;
    y = x * tan;
  } else {
    // Top or bottom edge
    y = Math.sin(angle) > 0 ? hh : -hh;
    x = y / tan;
  }

  // Apply gap
  const dist = Math.sqrt(x * x + y * y);
  const gapFactor = (dist + gap) / dist;

  return {
    x: cx + x * gapFactor,
    y: cy + y * gapFactor,
  };
}

function getEllipseBindingPoint(element: DrawElement, angle: number, gap: number): Point {
  const hw = element.width / 2;
  const hh = element.height / 2;
  const cx = element.x + hw;
  const cy = element.y + hh;

  // Point on ellipse
  const x = hw * Math.cos(angle);
  const y = hh * Math.sin(angle);

  // Apply gap
  const dist = Math.sqrt(x * x + y * y);
  const gapFactor = (dist + gap) / dist;

  return {
    x: cx + x * gapFactor,
    y: cy + y * gapFactor,
  };
}

function getDiamondBindingPoint(element: DrawElement, angle: number, gap: number): Point {
  const hw = element.width / 2;
  const hh = element.height / 2;
  const cx = element.x + hw;
  const cy = element.y + hh;

  // Normalize angle to 0-2PI
  let a = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  let x: number, y: number;

  // Diamond has 4 edges, determine which one based on angle
  if (a < Math.PI / 2) {
    // Top-right edge
    const t = a / (Math.PI / 2);
    x = hw * (1 - t);
    y = -hh * t;
  } else if (a < Math.PI) {
    // Bottom-right edge
    const t = (a - Math.PI / 2) / (Math.PI / 2);
    x = hw * t;
    y = hh * (1 - t);
  } else if (a < 3 * Math.PI / 2) {
    // Bottom-left edge
    const t = (a - Math.PI) / (Math.PI / 2);
    x = -hw * (1 - t);
    y = hh * t;
  } else {
    // Top-left edge
    const t = (a - 3 * Math.PI / 2) / (Math.PI / 2);
    x = -hw * t;
    y = -hh * (1 - t);
  }

  // Apply gap
  const dist = Math.sqrt(x * x + y * y);
  const gapFactor = dist > 0 ? (dist + gap) / dist : 1;

  return {
    x: cx + x * gapFactor,
    y: cy + y * gapFactor,
  };
}

// Find the closest bindable element to a point
export function findBindingTarget(
  point: Point,
  elements: DrawElement[],
  excludeIds: Set<string> = new Set()
): { element: DrawElement; binding: Binding } | null {
  let closest: { element: DrawElement; distance: number } | null = null;

  for (const element of elements) {
    if (!isBindableElement(element) || excludeIds.has(element.id)) continue;

    const center = getElementCenter(element);
    const distance = Math.sqrt(
      Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
    );

    // Check if point is near the element
    const maxDist = Math.max(element.width, element.height) / 2 + SNAP_DISTANCE;

    if (distance < maxDist && (!closest || distance < closest.distance)) {
      closest = { element, distance };
    }
  }

  if (!closest) return null;

  return {
    element: closest.element,
    binding: {
      elementId: closest.element.id,
      focus: 0, // Could calculate more precise focus
      gap: 2,
    },
  };
}

// Update arrow/line points based on bindings
export function updateBoundPoints(
  element: DrawElement,
  elements: DrawElement[]
): { startPoint: Point; endPoint: Point } | null {
  if (element.type !== 'line' && element.type !== 'arrow') return null;

  const lineElement = element as any;
  if (lineElement.points.length < 2) return null;

  let startPoint = { x: element.x, y: element.y };
  let endPoint = {
    x: element.x + lineElement.points[lineElement.points.length - 1].x,
    y: element.y + lineElement.points[lineElement.points.length - 1].y,
  };

  // Update start point if bound
  if (lineElement.startBinding) {
    const boundElement = elements.find(e => e.id === lineElement.startBinding.elementId);
    if (boundElement) {
      startPoint = getBindingPoint(
        boundElement,
        endPoint,
        lineElement.startBinding.gap,
        lineElement.startBinding.fixedPoint
      );
    }
  }

  // Update end point if bound
  if (lineElement.endBinding) {
    const boundElement = elements.find(e => e.id === lineElement.endBinding.elementId);
    if (boundElement) {
      endPoint = getBindingPoint(
        boundElement,
        startPoint,
        lineElement.endBinding.gap,
        lineElement.endBinding.fixedPoint
      );
    }
  }

  return { startPoint, endPoint };
}

// Convert a normalized point (0-1) on the shape perimeter to absolute coordinates
function getPointFromNormalized(element: DrawElement, normalized: { x: number; y: number }, gap: number): Point {
  const hw = element.width / 2;
  const hh = element.height / 2;
  const cx = element.x + hw;
  const cy = element.y + hh;

  // Convert normalized (0-1) to relative position from center
  // normalized.x and normalized.y are stored as offsets from center, normalized by half-width/height
  const x = normalized.x * hw;
  const y = normalized.y * hh;

  // Apply gap
  const dist = Math.sqrt(x * x + y * y);
  const gapFactor = dist > 0 ? (dist + gap) / dist : 1;

  return {
    x: cx + x * gapFactor,
    y: cy + y * gapFactor,
  };
}

// Calculate fixed point binding - stores the exact edge position chosen by user
// Returns normalized coordinates (relative to center, scaled by half-dimensions)
export function getFixedBindingPoint(
  element: DrawElement,
  cursorPoint: Point,
  gap: number
): { point: Point; fixedPoint: { x: number; y: number } } {
  const center = getElementCenter(element);
  const hw = element.width / 2;
  const hh = element.height / 2;

  // Calculate angle from center to cursor
  const angle = Math.atan2(cursorPoint.y - center.y, cursorPoint.x - center.x);

  // Get the point on the shape edge
  let edgePoint: Point;
  switch (element.type) {
    case 'ellipse':
      edgePoint = getEllipseBindingPoint(element, angle, 0);
      break;
    case 'diamond':
      edgePoint = getDiamondBindingPoint(element, angle, 0);
      break;
    case 'rectangle':
    default:
      edgePoint = getRectangleBindingPoint(element, angle, 0);
      break;
  }

  // Calculate normalized position (relative to center, scaled by half-dimensions)
  const fixedPoint = {
    x: (edgePoint.x - center.x) / (hw || 1),
    y: (edgePoint.y - center.y) / (hh || 1),
  };

  // Apply gap to the edge point for the returned point
  const dist = Math.sqrt(
    Math.pow(edgePoint.x - center.x, 2) + Math.pow(edgePoint.y - center.y, 2)
  );
  const gapFactor = dist > 0 ? (dist + gap) / dist : 1;

  return {
    point: {
      x: center.x + (edgePoint.x - center.x) * gapFactor,
      y: center.y + (edgePoint.y - center.y) * gapFactor,
    },
    fixedPoint,
  };
}

// Find binding target with optional fixed point (for Alt+drag)
export function findBindingTargetWithFixed(
  point: Point,
  elements: DrawElement[],
  excludeIds: Set<string> = new Set(),
  useFixedPoint: boolean = false
): { element: DrawElement; binding: Binding } | null {
  let closest: { element: DrawElement; distance: number } | null = null;

  for (const element of elements) {
    if (!isBindableElement(element) || excludeIds.has(element.id)) continue;

    const center = getElementCenter(element);
    const distance = Math.sqrt(
      Math.pow(point.x - center.x, 2) + Math.pow(point.y - center.y, 2)
    );

    // Check if point is near the element
    const maxDist = Math.max(element.width, element.height) / 2 + SNAP_DISTANCE;

    if (distance < maxDist && (!closest || distance < closest.distance)) {
      closest = { element, distance };
    }
  }

  if (!closest) return null;

  const binding: Binding = {
    elementId: closest.element.id,
    focus: 0,
    gap: 2,
  };

  // If using fixed point (Alt+drag), calculate and store the fixed position
  if (useFixedPoint) {
    const fixed = getFixedBindingPoint(closest.element, point, 2);
    binding.fixedPoint = fixed.fixedPoint;
  }

  return {
    element: closest.element,
    binding,
  };
}
