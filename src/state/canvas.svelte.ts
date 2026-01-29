// Canvas view state (pan/zoom)

export const canvasState = createCanvasState();

function createCanvasState() {
  let offset = $state({ x: 0, y: 0 });
  let scale = $state(1);

  return {
    get offset() { return offset; },
    get scale() { return scale; },

    pan(dx: number, dy: number) {
      offset = { x: offset.x + dx, y: offset.y + dy };
    },

    zoom(delta: number, centerX: number, centerY: number) {
      const zoomFactor = delta > 0 ? 0.9 : 1.1;
      const newScale = Math.min(Math.max(scale * zoomFactor, 0.1), 10);

      // Zoom toward cursor position
      const scaleChange = newScale / scale;
      offset = {
        x: centerX - (centerX - offset.x) * scaleChange,
        y: centerY - (centerY - offset.y) * scaleChange,
      };

      scale = newScale;
    },

    reset() {
      offset = { x: 0, y: 0 };
      scale = 1;
    },

    // Convert screen coords to canvas coords
    screenToCanvas(screenX: number, screenY: number) {
      return {
        x: (screenX - offset.x) / scale,
        y: (screenY - offset.y) / scale,
      };
    },

    // Convert canvas coords to screen coords
    canvasToScreen(canvasX: number, canvasY: number) {
      return {
        x: canvasX * scale + offset.x,
        y: canvasY * scale + offset.y,
      };
    },
  };
}
