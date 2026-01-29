import type { DrawElement, Point } from '../types/element';

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

// Get the actual bounding box for any element
export function getElementBounds(element: DrawElement): Bounds {
  if (element.type === 'line' || element.type === 'arrow' || element.type === 'freedraw') {
    return getLineBounds(element);
  }

  // For shapes, use x, y, width, height directly
  return {
    minX: element.x,
    minY: element.y,
    maxX: element.x + element.width,
    maxY: element.y + element.height,
    width: element.width,
    height: element.height,
  };
}

function getLineBounds(element: DrawElement): Bounds {
  const points = (element as any).points as Point[];
  if (!points || points.length === 0) {
    return {
      minX: element.x,
      minY: element.y,
      maxX: element.x,
      maxY: element.y,
      width: 0,
      height: 0,
    };
  }

  // Convert relative points to absolute
  const absolutePoints = points.map(p => ({
    x: element.x + p.x,
    y: element.y + p.y,
  }));

  const xs = absolutePoints.map(p => p.x);
  const ys = absolutePoints.map(p => p.y);

  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Check if a point is within element bounds (with optional padding)
export function isPointInBounds(point: Point, element: DrawElement, padding: number = 5): boolean {
  const bounds = getElementBounds(element);

  return (
    point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
  );
}

// For lines, also check distance to the line segment
export function isPointNearLine(point: Point, element: DrawElement, threshold: number = 10): boolean {
  if (element.type !== 'line' && element.type !== 'arrow') {
    return isPointInBounds(point, element);
  }

  const points = (element as any).points as Point[];
  if (!points || points.length < 2) return false;

  // Check distance to each line segment
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = { x: element.x + points[i].x, y: element.y + points[i].y };
    const p2 = { x: element.x + points[i + 1].x, y: element.y + points[i + 1].y };

    const dist = distanceToSegment(point, p1, p2);
    if (dist <= threshold) return true;
  }

  return false;
}

// Distance from point to line segment
function distanceToSegment(point: Point, p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // p1 and p2 are the same point
    return Math.sqrt((point.x - p1.x) ** 2 + (point.y - p1.y) ** 2);
  }

  // Project point onto line, clamped to segment
  let t = ((point.x - p1.x) * dx + (point.y - p1.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));

  const projX = p1.x + t * dx;
  const projY = p1.y + t * dy;

  return Math.sqrt((point.x - projX) ** 2 + (point.y - projY) ** 2);
}
