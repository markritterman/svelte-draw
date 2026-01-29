import type { RoughCanvas } from 'roughjs/bin/canvas';
import type { DrawElement } from '../../types/element';
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
      const hw = element.width / 2;
      const hh = element.height / 2;
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

      if (points.length === 2) {
        rc.line(points[0][0], points[0][1], points[1][0], points[1][1], options);
      } else if (points.length > 2) {
        rc.linearPath(points, options);
      }

      // Draw arrowheads for arrow type
      if (element.type === 'arrow' && points.length >= 2) {
        const lastIdx = points.length - 1;
        if (element.endArrowhead) {
          drawArrowhead(ctx, points[lastIdx - 1], points[lastIdx], element.strokeColor, element.strokeWidth, element.endArrowhead);
        }
        if (element.startArrowhead) {
          drawArrowhead(ctx, points[1], points[0], element.strokeColor, element.strokeWidth, element.startArrowhead);
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
  const padding = 5;
  const bounds = getElementBounds(element);
  const x = bounds.minX - padding;
  const y = bounds.minY - padding;
  const w = bounds.width + padding * 2;
  const h = bounds.height + padding * 2;

  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  // Corner handles
  const handleSize = 8;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0ea5e9';

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
