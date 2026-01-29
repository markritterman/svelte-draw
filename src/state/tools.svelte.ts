import type { Tool } from '../types/tools';
import { defaultElementProps } from '../types/element';

export const toolsState = createToolsState();

function createToolsState() {
  let activeTool = $state<Tool>('selection');

  // Current drawing style (applied to new elements)
  let strokeColor = $state(defaultElementProps.strokeColor);
  let backgroundColor = $state(defaultElementProps.backgroundColor);
  let fillStyle = $state(defaultElementProps.fillStyle);
  let strokeWidth = $state(defaultElementProps.strokeWidth);
  let roughness = $state(defaultElementProps.roughness);

  return {
    get activeTool() { return activeTool; },
    get strokeColor() { return strokeColor; },
    get backgroundColor() { return backgroundColor; },
    get fillStyle() { return fillStyle; },
    get strokeWidth() { return strokeWidth; },
    get roughness() { return roughness; },

    setTool(tool: Tool) {
      activeTool = tool;
    },

    setStrokeColor(color: string) {
      strokeColor = color;
    },

    setBackgroundColor(color: string) {
      backgroundColor = color;
    },

    setFillStyle(style: typeof fillStyle) {
      fillStyle = style;
    },

    setStrokeWidth(width: number) {
      strokeWidth = width;
    },

    setRoughness(r: number) {
      roughness = r;
    },

    // Get current style props for new elements
    getStyleProps() {
      return {
        strokeColor,
        backgroundColor,
        fillStyle,
        strokeWidth,
        roughness,
      };
    },
  };
}
