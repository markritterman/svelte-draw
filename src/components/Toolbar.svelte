<script lang="ts">
  import { toolsState } from '../state/tools.svelte';
  import type { Tool } from '../types/tools';
  import {
    MousePointer2,
    Hand,
    Square,
    Circle,
    Diamond,
    Minus,
    ArrowUpRight,
    Pencil,
    Type,
  } from 'lucide-svelte';

  const tools: { id: Tool; label: string; shortcut: string; icon: typeof MousePointer2 }[] = [
    { id: 'selection', label: 'Selection', shortcut: 'V', icon: MousePointer2 },
    { id: 'hand', label: 'Hand', shortcut: 'H', icon: Hand },
    { id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square },
    { id: 'ellipse', label: 'Ellipse', shortcut: 'O', icon: Circle },
    { id: 'diamond', label: 'Diamond', shortcut: 'D', icon: Diamond },
    { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
    { id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight },
    { id: 'freedraw', label: 'Freedraw', shortcut: 'P', icon: Pencil },
    { id: 'text', label: 'Text', shortcut: 'T', icon: Type },
  ];
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1.5">
  {#each tools as tool}
    <button
      class="w-9 h-9 flex items-center justify-center rounded transition-colors"
      class:bg-sky-100={toolsState.activeTool === tool.id}
      class:text-sky-700={toolsState.activeTool === tool.id}
      class:text-gray-600={toolsState.activeTool !== tool.id}
      class:hover:bg-gray-100={toolsState.activeTool !== tool.id}
      onclick={() => toolsState.setTool(tool.id)}
      title="{tool.label} ({tool.shortcut})"
    >
      <tool.icon size={18} />
    </button>
  {/each}
</div>
