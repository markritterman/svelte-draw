<script lang="ts">
  import { onMount } from 'svelte';
  import rough from 'roughjs';
  import { canvasState } from '../state/canvas.svelte';
  import { elementsState } from '../state/elements.svelte';
  import { toolsState } from '../state/tools.svelte';
  import { createElement, type DrawElement, type Point, type Binding } from '../types/element';
  import { renderElement, renderSelectionBox } from '../lib/render/elements';
  import { findBindingTarget, getBindingPoint, updateBoundPoints } from '../lib/binding';
  import { isPointInBounds, isPointNearLine, getElementBounds } from '../lib/bounds';

  let canvasEl: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let rc: ReturnType<typeof rough.canvas>;

  let isDrawing = $state(false);
  let isPanning = $state(false);
  let isDragging = $state(false);
  let isSelecting = $state(false);
  let isDraggingEndpoint = $state<'start' | 'end' | null>(null);
  let endpointDragInfo = $state<{ currentPos: Point; otherEnd: Point } | null>(null);
  let lastMouse = $state({ x: 0, y: 0 });
  let dragStart = $state({ x: 0, y: 0 });
  let selectionBox = $state<{ x: number; y: number; width: number; height: number } | null>(null);
  let currentElement = $state<DrawElement | null>(null);

  // Binding snap state
  let startSnapTarget = $state<{ element: DrawElement; binding: Binding } | null>(null);
  let endSnapTarget = $state<{ element: DrawElement; binding: Binding } | null>(null);

  // Debug mode - expose globally for debug panel
  let showHitAreas = $state(false);
  if (typeof window !== 'undefined') {
    (window as any).toggleHitAreas = () => { showHitAreas = !showHitAreas; };
  }

  onMount(() => {
    ctx = canvasEl.getContext('2d')!;
    rc = rough.canvas(canvasEl);

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
    };
  });

  function resize() {
    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
  }

  // Redraw when state changes
  $effect(() => {
    // Access reactive values
    canvasState.offset;
    canvasState.scale;
    elementsState.elements;
    elementsState.selectedIds;
    currentElement;
    startSnapTarget;
    endSnapTarget;
    endpointDragInfo;
    showHitAreas;
    selectionBox;
    draw();
  });

  function draw() {
    if (!ctx || !rc) return;

    const { offset, scale } = canvasState;

    // Clear and reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

    // Draw grid
    drawGrid();

    // Apply pan/zoom transform
    ctx.setTransform(scale, 0, 0, scale, offset.x, offset.y);

    // Render all elements
    for (const element of elementsState.elements) {
      renderElement(rc, ctx, element);

      // Draw selection box if selected
      if (elementsState.selectedIds.has(element.id)) {
        renderSelectionBox(ctx, element);
      }
    }

    // Render current drawing element
    if (currentElement) {
      renderElement(rc, ctx, currentElement);
    }

    // Draw snap indicators (glue lines)
    if (startSnapTarget && endpointDragInfo) {
      drawSnapIndicator(startSnapTarget, endpointDragInfo.currentPos, endpointDragInfo.otherEnd);
    }
    if (endSnapTarget && endpointDragInfo) {
      drawSnapIndicator(endSnapTarget, endpointDragInfo.currentPos, endpointDragInfo.otherEnd);
    }

    // Draw hit areas for debugging
    if (showHitAreas) {
      for (const element of elementsState.elements) {
        drawHitArea(element);
      }
    }

    // Draw selection box
    if (selectionBox && selectionBox.width > 0 && selectionBox.height > 0) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.1)';
      ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.strokeStyle = '#0ea5e9';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.width, selectionBox.height);
      ctx.setLineDash([]);
    }
  }

  function drawHitArea(element: DrawElement) {
    const bounds = getElementBounds(element);

    // Draw bounding box in red
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(bounds.minX, bounds.minY, bounds.width, bounds.height);
    ctx.setLineDash([]);

    // For lines/arrows, also draw the actual line path
    if (element.type === 'line' || element.type === 'arrow') {
      const points = (element as any).points;
      if (points && points.length >= 2) {
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(element.x + points[0].x, element.y + points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(element.x + points[i].x, element.y + points[i].y);
        }
        ctx.stroke();

        // Draw start/end points
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(element.x + points[0].x, element.y + points[0].y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(element.x + points[points.length - 1].x, element.y + points[points.length - 1].y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw element x,y origin point in blue
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(element.x, element.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSnapIndicator(target: { element: DrawElement; binding: Binding }, fromPoint: Point, otherEnd: Point) {
    // Calculate where the snap point will be on the shape edge
    const snapPoint = getBindingPoint(target.element, otherEnd, target.binding.gap);

    // Draw glue line from cursor to snap point
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(fromPoint.x, fromPoint.y);
    ctx.lineTo(snapPoint.x, snapPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw snap point indicator (where it will land)
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.arc(snapPoint.x, snapPoint.y, 6, 0, Math.PI * 2);
    ctx.fill();

    // Draw white inner circle
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(snapPoint.x, snapPoint.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawGrid() {
    const { offset, scale } = canvasState;
    const gridSize = 20;

    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;

    const startX = Math.floor(-offset.x / scale / gridSize) * gridSize;
    const startY = Math.floor(-offset.y / scale / gridSize) * gridSize;
    const endX = Math.ceil((canvasEl.width - offset.x) / scale / gridSize) * gridSize;
    const endY = Math.ceil((canvasEl.height - offset.y) / scale / gridSize) * gridSize;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridSize) {
      const screenX = x * scale + offset.x;
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvasEl.height);
    }
    for (let y = startY; y <= endY; y += gridSize) {
      const screenY = y * scale + offset.y;
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvasEl.width, screenY);
    }
    ctx.stroke();
  }

  function getCanvasPoint(e: MouseEvent): Point {
    return canvasState.screenToCanvas(e.clientX, e.clientY);
  }

  function onMouseDown(e: MouseEvent) {
    const tool = toolsState.activeTool;
    const point = getCanvasPoint(e);

    // Middle mouse or hand tool for panning
    if (e.button === 1 || tool === 'hand' || (e.button === 0 && e.shiftKey)) {
      isPanning = true;
      lastMouse = { x: e.clientX, y: e.clientY };
      e.preventDefault();
      return;
    }

    if (e.button !== 0) return;

    // Selection tool
    if (tool === 'selection') {
      // First check if clicking on an endpoint handle of a selected line/arrow
      for (const id of elementsState.selectedIds) {
        const el = elementsState.getElementById(id);
        if (el && (el.type === 'line' || el.type === 'arrow')) {
          const endpoint = hitTestEndpoint(point, el);
          if (endpoint) {
            isDraggingEndpoint = endpoint;
            dragStart = { x: point.x, y: point.y };
            return;
          }
        }
      }

      const hit = hitTest(point);
      if (hit) {
        if (!elementsState.selectedIds.has(hit.id)) {
          elementsState.select(hit.id, e.ctrlKey || e.metaKey);
        }
        isDragging = true;
        dragStart = { x: point.x, y: point.y };
      } else {
        // Start selection box drag
        if (!e.ctrlKey && !e.metaKey) {
          elementsState.clearSelection();
        }
        isSelecting = true;
        dragStart = { x: point.x, y: point.y };
        selectionBox = { x: point.x, y: point.y, width: 0, height: 0 };
      }
      return;
    }

    // Drawing tools
    if (['rectangle', 'ellipse', 'diamond', 'line', 'arrow', 'freedraw'].includes(tool)) {
      isDrawing = true;
      const styleProps = toolsState.getStyleProps();

      // Check for snap at start point for line/arrow
      if (tool === 'line' || tool === 'arrow') {
        startSnapTarget = findBindingTarget(point, elementsState.elements);

        let startPoint = point;
        if (startSnapTarget) {
          // Snap to the binding point
          startPoint = getBindingPoint(startSnapTarget.element, point, 2);
        }

        currentElement = createElement(tool as any, startPoint.x, startPoint.y, styleProps);
        (currentElement as any).points = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
        (currentElement as any).startBinding = startSnapTarget?.binding || null;
      } else {
        currentElement = createElement(tool as any, point.x, point.y, styleProps);

        if (tool === 'freedraw') {
          (currentElement as any).points = [{ x: 0, y: 0 }];
        }
      }
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (isPanning) {
      const dx = e.clientX - lastMouse.x;
      const dy = e.clientY - lastMouse.y;
      canvasState.pan(dx, dy);
      lastMouse = { x: e.clientX, y: e.clientY };
      return;
    }

    // Endpoint handle drag for lines/arrows
    if (isDraggingEndpoint) {
      const point = getCanvasPoint(e);

      for (const id of elementsState.selectedIds) {
        const el = elementsState.getElementById(id);
        if (el && (el.type === 'line' || el.type === 'arrow')) {
          const lineEl = el as any;
          const points = [...lineEl.points];

          // Build exclude set (the arrow itself and any element bound to the other end)
          const excludeIds = new Set<string>([id]);
          if (isDraggingEndpoint === 'start' && lineEl.endBinding) {
            excludeIds.add(lineEl.endBinding.elementId);
          } else if (isDraggingEndpoint === 'end' && lineEl.startBinding) {
            excludeIds.add(lineEl.startBinding.elementId);
          }

          // Check for snap target (for indicator only, don't snap yet)
          const snapTarget = findBindingTarget(point, elementsState.elements, excludeIds);

          // Calculate the other end position for snap point calculation
          const otherEnd = isDraggingEndpoint === 'start'
            ? { x: el.x + points[points.length - 1].x, y: el.y + points[points.length - 1].y }
            : { x: el.x + points[0].x, y: el.y + points[0].y };

          // Update snap indicator state (preview only)
          if (isDraggingEndpoint === 'start') {
            startSnapTarget = snapTarget;
            endSnapTarget = null;
          } else {
            startSnapTarget = null;
            endSnapTarget = snapTarget;
          }

          // Track drag info for drawing the glue line
          endpointDragInfo = { currentPos: point, otherEnd };

          // Use raw point during drag (no snapping)
          if (isDraggingEndpoint === 'start') {
            // Moving start point: adjust element position and recalculate relative points
            const oldStart = { x: el.x + points[0].x, y: el.y + points[0].y };
            const newStart = point;

            // Update element origin to new start position
            const dx = newStart.x - oldStart.x;
            const dy = newStart.y - oldStart.y;

            // Shift all points relative to the new origin
            for (let i = 1; i < points.length; i++) {
              points[i] = { x: points[i].x - dx, y: points[i].y - dy };
            }
            points[0] = { x: 0, y: 0 };

            elementsState.update(id, {
              x: newStart.x,
              y: newStart.y,
              points,
              startBinding: null, // Clear binding during drag
            });
          } else if (isDraggingEndpoint === 'end') {
            // Moving end point: just update the last point relative to origin
            const lastIdx = points.length - 1;
            points[lastIdx] = {
              x: point.x - el.x,
              y: point.y - el.y,
            };

            elementsState.update(id, {
              points,
              endBinding: null, // Clear binding during drag
            });
          }
        }
      }
      return;
    }

    // Selection box drag
    if (isSelecting && selectionBox) {
      const point = getCanvasPoint(e);
      selectionBox = {
        x: Math.min(dragStart.x, point.x),
        y: Math.min(dragStart.y, point.y),
        width: Math.abs(point.x - dragStart.x),
        height: Math.abs(point.y - dragStart.y),
      };

      // Select elements in real-time as we drag
      const selectedIds: string[] = [];
      for (const el of elementsState.elements) {
        const bounds = getElementBounds(el);
        if (boxesIntersect(selectionBox, bounds)) {
          selectedIds.push(el.id);
        }
      }
      elementsState.selectMultiple(selectedIds);
      return;
    }

    // Dragging selected elements
    if (isDragging && elementsState.selectedIds.size > 0) {
      const point = getCanvasPoint(e);
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;

      // Get IDs being moved
      const movingIds = new Set(elementsState.selectedIds);

      for (const id of elementsState.selectedIds) {
        const el = elementsState.getElementById(id);
        if (el) {
          elementsState.update(id, {
            x: el.x + dx,
            y: el.y + dy,
          });
        }
      }

      // Update any arrows/lines bound to moved elements
      updateBoundArrows(movingIds);

      dragStart = { x: point.x, y: point.y };
      return;
    }

    if (!isDrawing || !currentElement) return;

    const point = getCanvasPoint(e);
    const tool = toolsState.activeTool;

    if (tool === 'rectangle' || tool === 'ellipse' || tool === 'diamond') {
      currentElement = {
        ...currentElement,
        width: point.x - currentElement.x,
        height: point.y - currentElement.y,
      };
    } else if (tool === 'line' || tool === 'arrow') {
      // Check for snap at end point
      const excludeIds = new Set<string>();
      if (startSnapTarget) excludeIds.add(startSnapTarget.element.id);

      endSnapTarget = findBindingTarget(point, elementsState.elements, excludeIds);

      let endPoint = point;
      if (endSnapTarget) {
        endPoint = getBindingPoint(endSnapTarget.element, { x: currentElement.x, y: currentElement.y }, 2);
      }

      const dx = endPoint.x - currentElement.x;
      const dy = endPoint.y - currentElement.y;
      (currentElement as any).points = [{ x: 0, y: 0 }, { x: dx, y: dy }];
      currentElement = { ...currentElement, width: Math.abs(dx), height: Math.abs(dy) };
    } else if (tool === 'freedraw') {
      const dx = point.x - currentElement.x;
      const dy = point.y - currentElement.y;
      const points = [...(currentElement as any).points, { x: dx, y: dy }];
      (currentElement as any).points = points;

      const xs = points.map((p: Point) => p.x);
      const ys = points.map((p: Point) => p.y);
      currentElement = {
        ...currentElement,
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
  }

  function onMouseUp() {
    isPanning = false;
    isDragging = false;

    // Finish endpoint drag - apply snap if near a shape
    if (isDraggingEndpoint) {
      const snapTarget = isDraggingEndpoint === 'start' ? startSnapTarget : endSnapTarget;

      if (snapTarget) {
        // Apply the snap on release
        for (const id of elementsState.selectedIds) {
          const el = elementsState.getElementById(id);
          if (el && (el.type === 'line' || el.type === 'arrow')) {
            const lineEl = el as any;
            const points = [...lineEl.points];

            // Get the other end for direction calculation
            const otherEnd = isDraggingEndpoint === 'start'
              ? { x: el.x + points[points.length - 1].x, y: el.y + points[points.length - 1].y }
              : { x: el.x, y: el.y };

            const snappedPoint = getBindingPoint(snapTarget.element, otherEnd, snapTarget.binding.gap);

            if (isDraggingEndpoint === 'start') {
              const dx = snappedPoint.x - el.x;
              const dy = snappedPoint.y - el.y;

              // Shift all points relative to new origin
              for (let i = 1; i < points.length; i++) {
                points[i] = { x: points[i].x - dx, y: points[i].y - dy };
              }
              points[0] = { x: 0, y: 0 };

              elementsState.update(id, {
                x: snappedPoint.x,
                y: snappedPoint.y,
                points,
                startBinding: snapTarget.binding,
              });
            } else {
              const lastIdx = points.length - 1;
              points[lastIdx] = {
                x: snappedPoint.x - el.x,
                y: snappedPoint.y - el.y,
              };

              elementsState.update(id, {
                points,
                endBinding: snapTarget.binding,
              });
            }
          }
        }
      }

      isDraggingEndpoint = null;
      startSnapTarget = null;
      endSnapTarget = null;
      endpointDragInfo = null;
      return;
    }

    // Finish selection box
    if (isSelecting) {
      isSelecting = false;
      selectionBox = null;
      return;
    }

    if (isDrawing && currentElement) {
      // Store end binding for line/arrow
      if ((currentElement.type === 'line' || currentElement.type === 'arrow') && endSnapTarget) {
        (currentElement as any).endBinding = endSnapTarget.binding;
      }

      // Normalize negative dimensions
      if (currentElement.width < 0) {
        currentElement.x += currentElement.width;
        currentElement.width = Math.abs(currentElement.width);
      }
      if (currentElement.height < 0) {
        currentElement.y += currentElement.height;
        currentElement.height = Math.abs(currentElement.height);
      }

      // Only add if it has some size
      if (currentElement.width > 2 || currentElement.height > 2 ||
          (currentElement.type === 'freedraw' && (currentElement as any).points.length > 2)) {
        elementsState.add(currentElement);
      }

      currentElement = null;
      isDrawing = false;
      startSnapTarget = null;
      endSnapTarget = null;
    }
  }

  // Update arrows/lines that are bound to moved elements
  function updateBoundArrows(movedIds: Set<string>) {
    for (const element of elementsState.elements) {
      if (element.type !== 'line' && element.type !== 'arrow') continue;

      const lineEl = element as any;
      const startBound = lineEl.startBinding && movedIds.has(lineEl.startBinding.elementId);
      const endBound = lineEl.endBinding && movedIds.has(lineEl.endBinding.elementId);

      if (!startBound && !endBound) continue;

      // Recalculate bound points
      const boundPoints = updateBoundPoints(element, elementsState.elements);
      if (!boundPoints) continue;

      const { startPoint, endPoint } = boundPoints;

      // Update element position and points
      const newPoints = [
        { x: 0, y: 0 },
        { x: endPoint.x - startPoint.x, y: endPoint.y - startPoint.y },
      ];

      elementsState.update(element.id, {
        x: startPoint.x,
        y: startPoint.y,
        points: newPoints,
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
      });
    }
  }

  function hitTest(point: Point): DrawElement | null {
    for (let i = elementsState.elements.length - 1; i >= 0; i--) {
      const el = elementsState.elements[i];

      // Use line-specific hit test for lines/arrows
      if (el.type === 'line' || el.type === 'arrow') {
        if (isPointNearLine(point, el, 10)) {
          return el;
        }
      } else if (isPointInBounds(point, el, 0)) {
        return el;
      }
    }
    return null;
  }

  // Check if point is near a line/arrow endpoint handle
  function hitTestEndpoint(point: Point, element: DrawElement): 'start' | 'end' | null {
    if (element.type !== 'line' && element.type !== 'arrow') return null;

    const lineEl = element as any;
    if (!lineEl.points || lineEl.points.length < 2) return null;

    const handleRadius = 8;
    const startPoint = {
      x: element.x + lineEl.points[0].x,
      y: element.y + lineEl.points[0].y,
    };
    const endPoint = {
      x: element.x + lineEl.points[lineEl.points.length - 1].x,
      y: element.y + lineEl.points[lineEl.points.length - 1].y,
    };

    const distToStart = Math.hypot(point.x - startPoint.x, point.y - startPoint.y);
    const distToEnd = Math.hypot(point.x - endPoint.x, point.y - endPoint.y);

    if (distToStart <= handleRadius) return 'start';
    if (distToEnd <= handleRadius) return 'end';
    return null;
  }

  function boxesIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { minX: number; minY: number; maxX: number; maxY: number }
  ): boolean {
    return !(
      a.x + a.width < b.minX ||
      a.x > b.maxX ||
      a.y + a.height < b.minY ||
      a.y > b.maxY
    );
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      canvasState.zoom(e.deltaY, e.clientX, e.clientY);
    } else {
      canvasState.pan(-e.deltaX, -e.deltaY);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    const shortcuts: Record<string, string> = {
      v: 'selection',
      h: 'hand',
      r: 'rectangle',
      o: 'ellipse',
      d: 'diamond',
      l: 'line',
      a: 'arrow',
      p: 'freedraw',
      t: 'text',
    };

    const tool = shortcuts[e.key.toLowerCase()];
    if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
      toolsState.setTool(tool as any);
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && elementsState.selectedIds.size > 0) {
      elementsState.delete([...elementsState.selectedIds]);
    }

    if (e.key === 'Escape') {
      elementsState.clearSelection();
      toolsState.setTool('selection');
    }
  }

  function getCursor() {
    if (isPanning) return 'grabbing';
    if (isDragging) return 'move';
    if (isDraggingEndpoint) return 'crosshair';
    const tool = toolsState.activeTool;
    if (tool === 'hand') return 'grab';
    if (tool === 'selection') return 'default';
    return 'crosshair';
  }
</script>

<canvas
  bind:this={canvasEl}
  class="block touch-none"
  style:cursor={getCursor()}
  onmousedown={onMouseDown}
  onmousemove={onMouseMove}
  onmouseup={onMouseUp}
  onmouseleave={onMouseUp}
  onwheel={onWheel}
  oncontextmenu={(e) => e.preventDefault()}
></canvas>
