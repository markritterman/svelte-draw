import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { DrawElement, ArrowElement } from '../../types/element';
import type { Options } from 'roughjs/bin/core';
import { getElementBounds } from '../bounds';

export function renderElement(rc: RoughCanvas, ctx: CanvasRenderingContext2D, element: DrawElement) {
  // Convert strokeStyle to dash array
  const strokeLineDash = element.strokeStyle === 'dashed'
    ? [12, 8]
    : element.strokeStyle === 'dotted'
      ? [3, 6]
      : undefined;

  const options: Options = {
    seed: element.seed,
    roughness: element.roughness,
    stroke: element.strokeColor,
    strokeWidth: element.strokeWidth,
    fill: element.fillStyle !== 'none' ? element.backgroundColor : undefined,
    fillStyle: element.fillStyle === 'none' ? undefined : element.fillStyle,
    strokeLineDash,
  };

  ctx.globalAlpha = element.opacity;

  switch (element.type) {
    case 'rectangle':
      rc.rectangle(element.x, element.y, element.width, element.height, options);
      break;

    case 'ellipse':
      rc.ellipse(
        element.x + element.width / 2,
        element.y + element.height / 2,
        element.width,
        element.height,
        options
      );
      break;

    case 'diamond': {
      const cx = element.x + element.width / 2;
      const cy = element.y + element.height / 2;
      rc.polygon([
        [cx, element.y],
        [element.x + element.width, cy],
        [cx, element.y + element.height],
        [element.x, cy],
      ], options);
      break;
    }

    case 'line':
    case 'arrow': {
      if (element.points.length < 1) break;
      const points = element.points.map(p => [element.x + p.x, element.y + p.y] as [number, number]);

      if (points.length >= 2) {
        const arrowEl = element as ArrowElement;
        const lineType = element.type === 'arrow' ? (arrowEl.lineType || 'sharp') : 'sharp';

        if (lineType === 'curved' && points.length === 2) {
          // Curved arrow using quadratic bezier
          const controlPoint = getControlPoint(arrowEl, points);
          drawCurvedPath(rc, ctx, points[0], controlPoint, points[1], options);
        } else if (lineType === 'elbow' && points.length === 2) {
          // Elbow arrow with orthogonal segments
          const elbowPoints = getElbowPoints(arrowEl, points);
          rc.linearPath(elbowPoints, options);
        } else {
          // Sharp/straight line or multi-point path
          if (points.length === 2) {
            rc.line(points[0][0], points[0][1], points[1][0], points[1][1], options);
          } else if (points.length > 2) {
            rc.linearPath(points, options);
          }
        }

        // Draw arrowheads for arrow type
        if (element.type === 'arrow') {
          const lastIdx = points.length - 1;

          // Get the direction vectors based on line type for proper arrowhead angles
          let endFromPoint = points[lastIdx - 1];
          let startFromPoint = points.length > 1 ? points[1] : points[0];

          if (lineType === 'curved') {
            const controlPoint = getControlPoint(arrowEl, points);
            // For curved, use control point to determine arrow direction
            endFromPoint = controlPoint;
            startFromPoint = controlPoint;
          } else if (lineType === 'elbow') {
            const elbowPoints = getElbowPoints(arrowEl, points);
            // For elbow, use the last segment direction
            endFromPoint = elbowPoints[elbowPoints.length - 2];
            startFromPoint = elbowPoints[1];
          }

          if (arrowEl.endArrowhead) {
            drawArrowhead(ctx, endFromPoint, points[lastIdx], element.strokeColor, element.strokeWidth, arrowEl.endArrowhead);
          }
          if (arrowEl.startArrowhead) {
            drawArrowhead(ctx, startFromPoint, points[0], element.strokeColor, element.strokeWidth, arrowEl.startArrowhead);
          }
        }
      }
      break;
    }

    case 'freedraw': {
      if (element.points.length < 2) break;
      const points = element.points.map(p => [element.x + p.x, element.y + p.y] as [number, number]);
      rc.linearPath(points, { ...options, fill: undefined });
      break;
    }

    case 'text':
      ctx.font = `${element.fontSize}px ${element.fontFamily}`;
      ctx.fillStyle = element.strokeColor;
      ctx.textAlign = element.textAlign;
      ctx.textBaseline = 'top';
      ctx.fillText(element.text, element.x, element.y);
      break;
  }

  ctx.globalAlpha = 1;
}

function drawArrowhead(
  ctx: CanvasRenderingContext2D,
  from: [number, number],
  to: [number, number],
  color: string,
  strokeWidth: number,
  type: 'arrow' | 'bar' | 'dot'
) {
  const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokeWidth;

  switch (type) {
    case 'arrow': {
      const headLength = 15 + strokeWidth * 2;
      ctx.beginPath();
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(
        to[0] - headLength * Math.cos(angle - Math.PI / 6),
        to[1] - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(to[0], to[1]);
      ctx.lineTo(
        to[0] - headLength * Math.cos(angle + Math.PI / 6),
        to[1] - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();
      break;
    }

    case 'bar': {
      const barLength = 10 + strokeWidth * 2;
      ctx.beginPath();
      ctx.moveTo(
        to[0] - barLength * Math.cos(angle - Math.PI / 2),
        to[1] - barLength * Math.sin(angle - Math.PI / 2)
      );
      ctx.lineTo(
        to[0] + barLength * Math.cos(angle - Math.PI / 2),
        to[1] + barLength * Math.sin(angle - Math.PI / 2)
      );
      ctx.stroke();
      break;
    }

    case 'dot': {
      const radius = 5 + strokeWidth;
      ctx.beginPath();
      ctx.arc(to[0], to[1], radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

export function renderSelectionBox(ctx: CanvasRenderingContext2D, element: DrawElement) {
  const handleSize = 8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 1;

  // For lines and arrows, show endpoint handles instead of bounding box
  if (element.type === 'line' || element.type === 'arrow') {
    if (element.points.length >= 2) {
      const points = element.points.map(p => ({
        x: element.x + p.x,
        y: element.y + p.y,
      }));

      // Draw a light line connecting the handles
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw handles at start and end points
      const startPoint = points[0];
      const endPoint = points[points.length - 1];

      // Start handle - green circle
      ctx.fillStyle = '#dcfce7';
      ctx.strokeStyle = '#16a34a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, handleSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // End handle - blue circle
      ctx.fillStyle = '#dbeafe';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(endPoint.x, endPoint.y, handleSize / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }

  // For other elements, draw bounding box with corner handles
  const padding = 5;
  const bounds = getElementBounds(element);
  const x = bounds.minX - padding;
  const y = bounds.minY - padding;
  const w = bounds.width + padding * 2;
  const h = bounds.height + padding * 2;

  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Corner handles
  const handles = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ];

  for (const [hx, hy] of handles) {
    ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
    ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
  }
}

// Get control point for curved arrows
// If user has set a custom control point, use it; otherwise calculate default
function getControlPoint(element: ArrowElement, points: [number, number][]): [number, number] {
  // If control points exist, use the first one
  if (element.controlPoints && element.controlPoints.length > 0) {
    return [
      element.x + element.controlPoints[0].x,
      element.y + element.controlPoints[0].y,
    ];
  }

  // Default: midpoint perpendicular to the line
  const [start, end] = points;
  const midX = (start[0] + end[0]) / 2;
  const midY = (start[1] + end[1]) / 2;

  // Calculate perpendicular offset (30% of line length)
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const length = Math.sqrt(dx * dx + dy * dy);
  const offset = length * 0.3;

  // Perpendicular direction (rotate 90 degrees)
  const perpX = -dy / length;
  const perpY = dx / length;

  return [midX + perpX * offset, midY + perpY * offset];
}

// Get points for elbow (orthogonal) arrows
function getElbowPoints(element: ArrowElement, points: [number, number][]): [number, number][] {
  // If control points exist, use them as breakpoints
  if (element.controlPoints && element.controlPoints.length > 0) {
    const result: [number, number][] = [points[0]];
    for (const cp of element.controlPoints) {
      result.push([element.x + cp.x, element.y + cp.y]);
    }
    result.push(points[1]);
    return result;
  }

  // Default elbow: horizontal from start, then vertical to end
  const [start, end] = points;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];

  // Choose routing based on which dimension is larger
  // This gives a more natural feel
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Horizontal first, then vertical
    const midX = start[0] + dx / 2;
    return [
      start,
      [midX, start[1]],
      [midX, end[1]],
      end,
    ];
  } else {
    // Vertical first, then horizontal
    const midY = start[1] + dy / 2;
    return [
      start,
      [start[0], midY],
      [end[0], midY],
      end,
    ];
  }
}

// Draw curved path using quadratic bezier
function drawCurvedPath(
  rc: RoughCanvas,
  _ctx: CanvasRenderingContext2D,
  start: [number, number],
  control: [number, number],
  end: [number, number],
  options: Options
) {
  // Use rough.js path with a bezier curve
  // Convert quadratic bezier to rough.js path command
  const path = `M ${start[0]} ${start[1]} Q ${control[0]} ${control[1]} ${end[0]} ${end[1]}`;
  rc.path(path, options);
}

// Render control point handles for selected curved/elbow arrows
export function renderControlPointHandles(ctx: CanvasRenderingContext2D, element: DrawElement) {
  if (element.type !== 'arrow') return;

  const arrowEl = element as ArrowElement;
  if (!arrowEl.lineType || arrowEl.lineType === 'sharp') return;

  const points = arrowEl.points.map(p => [element.x + p.x, element.y + p.y] as [number, number]);
  if (points.length < 2) return;

  const handleSize = 6;

  if (arrowEl.lineType === 'curved') {
    // Draw control point for curved arrow
    const controlPoint = getControlPoint(arrowEl, points);

    // Draw lines to control point
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    ctx.lineTo(controlPoint[0], controlPoint[1]);
    ctx.lineTo(points[1][0], points[1][1]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw control point handle - orange diamond
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(controlPoint[0], controlPoint[1] - handleSize);
    ctx.lineTo(controlPoint[0] + handleSize, controlPoint[1]);
    ctx.lineTo(controlPoint[0], controlPoint[1] + handleSize);
    ctx.lineTo(controlPoint[0] - handleSize, controlPoint[1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (arrowEl.lineType === 'elbow') {
    // Draw control points for elbow arrow (the bend points)
    const elbowPoints = getElbowPoints(arrowEl, points);

    // Draw midpoint control handles (skip start and end)
    ctx.fillStyle = '#fef3c7';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 2;

    for (let i = 1; i < elbowPoints.length - 1; i++) {
      const pt = elbowPoints[i];
      // Draw as small square
      ctx.fillRect(pt[0] - handleSize / 2, pt[1] - handleSize / 2, handleSize, handleSize);
      ctx.strokeRect(pt[0] - handleSize / 2, pt[1] - handleSize / 2, handleSize, handleSize);
    }
  }
}

// Export helper functions for hit testing control points
export function getControlPointPosition(element: ArrowElement): { x: number; y: number } | null {
  if (!element.lineType || element.lineType === 'sharp') return null;
  if (element.points.length < 2) return null;

  const points = element.points.map(p => [element.x + p.x, element.y + p.y] as [number, number]);

  if (element.lineType === 'curved') {
    const cp = getControlPoint(element, points);
    return { x: cp[0], y: cp[1] };
  }

  // For elbow, return null (multiple control points handled separately)
  return null;
}

export function getElbowControlPoints(element: ArrowElement): { x: number; y: number }[] {
  if (element.lineType !== 'elbow') return [];
  if (element.points.length < 2) return [];

  const points = element.points.map(p => [element.x + p.x, element.y + p.y] as [number, number]);
  const elbowPoints = getElbowPoints(element, points);

  // Return only the middle points (not start/end)
  return elbowPoints.slice(1, -1).map(p => ({ x: p[0], y: p[1] }));
}
