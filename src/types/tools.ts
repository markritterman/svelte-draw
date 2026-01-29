export type Tool =
  | 'selection'
  | 'rectangle'
  | 'ellipse'
  | 'diamond'
  | 'line'
  | 'arrow'
  | 'freedraw'
  | 'text'
  | 'hand'; // Pan tool

export const tools: { id: Tool; label: string; shortcut: string }[] = [
  { id: 'selection', label: 'Selection', shortcut: 'V' },
  { id: 'hand', label: 'Hand (Pan)', shortcut: 'H' },
  { id: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { id: 'ellipse', label: 'Ellipse', shortcut: 'O' },
  { id: 'diamond', label: 'Diamond', shortcut: 'D' },
  { id: 'line', label: 'Line', shortcut: 'L' },
  { id: 'arrow', label: 'Arrow', shortcut: 'A' },
  { id: 'freedraw', label: 'Freedraw', shortcut: 'P' },
  { id: 'text', label: 'Text', shortcut: 'T' },
];
