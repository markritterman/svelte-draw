<script lang="ts">
  import { elementsState } from '../state/elements.svelte';
  import { toolsState } from '../state/tools.svelte';
  import {
    Minus,
    MoreHorizontal,
    Ellipsis,
    Waves,
    CornerUpRight,
    ArrowRight,
    Copy,
    Trash2,
    ChevronDown,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
  } from 'lucide-svelte';

  const strokeColors = ['#1e293b', '#dc2626', '#16a34a', '#2563eb', '#d97706', '#000000'];
  const bgColors = ['transparent', '#fee2e2', '#dcfce7', '#dbeafe', '#fef3c7', '#e0f2fe'];

  // Get first selected element for display
  let selectedElement = $derived(
    elementsState.selectedIds.size === 1
      ? elementsState.getElementById([...elementsState.selectedIds][0])
      : null
  );

  let hasSelection = $derived(elementsState.selectedIds.size > 0);

  function updateSelected(changes: Record<string, any>) {
    for (const id of elementsState.selectedIds) {
      elementsState.update(id, changes);
    }
  }

  function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function duplicateSelected() {
    const newIds: string[] = [];
    for (const id of elementsState.selectedIds) {
      const el = elementsState.getElementById(id);
      if (el) {
        const newElement = {
          ...el,
          id: generateId(),
          x: el.x + 20,
          y: el.y + 20,
          seed: Math.floor(Math.random() * 2 ** 31),
          // Clear bindings for duplicated arrows/lines
          ...(el.type === 'line' || el.type === 'arrow' ? { startBinding: null, endBinding: null } : {}),
        };
        elementsState.add(newElement as any);
        newIds.push(newElement.id);
      }
    }
    // Select the new elements
    elementsState.selectMultiple(newIds);
  }

  function deleteSelected() {
    elementsState.delete([...elementsState.selectedIds]);
  }
</script>

{#if hasSelection}
  <div class="fixed top-16 left-4 w-48 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs">
    <!-- Stroke Color -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Stroke</div>
      <div class="flex gap-1">
        {#each strokeColors as color}
          <button
            class="w-6 h-6 rounded border-2 transition-all"
            class:border-sky-500={selectedElement?.strokeColor === color}
            class:border-gray-200={selectedElement?.strokeColor !== color}
            style:background-color={color}
            onclick={() => updateSelected({ strokeColor: color })}
          ></button>
        {/each}
      </div>
    </div>

    <!-- Background Color -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Background</div>
      <div class="flex gap-1">
        {#each bgColors as color}
          <button
            class="w-6 h-6 rounded border-2 transition-all"
            class:border-sky-500={selectedElement?.backgroundColor === color}
            class:border-gray-200={selectedElement?.backgroundColor !== color}
            style:background-color={color === 'transparent' ? 'white' : color}
            onclick={() => updateSelected({ backgroundColor: color })}
          >
            {#if color === 'transparent'}
              <span class="text-gray-400 text-[10px]">∅</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Stroke Width -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Stroke width</div>
      <div class="flex gap-1">
        {#each [1, 2, 4] as width}
          <button
            class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
            class:bg-sky-100={selectedElement?.strokeWidth === width}
            class:border-sky-500={selectedElement?.strokeWidth === width}
            class:border-gray-200={selectedElement?.strokeWidth !== width}
            class:hover:bg-gray-50={selectedElement?.strokeWidth !== width}
            onclick={() => updateSelected({ strokeWidth: width })}
          >
            <div class="bg-current rounded-full" style:width="{width * 3}px" style:height="{width}px"></div>
          </button>
        {/each}
      </div>
    </div>

    <!-- Stroke Style (solid/dashed/dotted) -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Stroke style</div>
      <div class="flex gap-1">
        <button
          class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
          class:bg-sky-100={selectedElement?.strokeStyle === 'solid'}
          class:border-sky-500={selectedElement?.strokeStyle === 'solid'}
          class:border-gray-200={selectedElement?.strokeStyle !== 'solid'}
          onclick={() => updateSelected({ strokeStyle: 'solid' })}
        >
          <Minus size={14} />
        </button>
        <button
          class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
          class:bg-sky-100={selectedElement?.strokeStyle === 'dashed'}
          class:border-sky-500={selectedElement?.strokeStyle === 'dashed'}
          class:border-gray-200={selectedElement?.strokeStyle !== 'dashed'}
          onclick={() => updateSelected({ strokeStyle: 'dashed' })}
        >
          <MoreHorizontal size={14} />
        </button>
        <button
          class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
          class:bg-sky-100={selectedElement?.strokeStyle === 'dotted'}
          class:border-sky-500={selectedElement?.strokeStyle === 'dotted'}
          class:border-gray-200={selectedElement?.strokeStyle !== 'dotted'}
          onclick={() => updateSelected({ strokeStyle: 'dotted' })}
        >
          <Ellipsis size={14} />
        </button>
      </div>
    </div>

    <!-- Sloppiness / Roughness -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Sloppiness</div>
      <div class="flex gap-1">
        {#each [0, 1, 2] as roughness}
          <button
            class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
            class:bg-sky-100={selectedElement?.roughness === roughness}
            class:border-sky-500={selectedElement?.roughness === roughness}
            class:border-gray-200={selectedElement?.roughness !== roughness}
            class:hover:bg-gray-50={selectedElement?.roughness !== roughness}
            onclick={() => updateSelected({ roughness })}
          >
            <Waves size={14} class={roughness === 0 ? 'opacity-30' : roughness === 1 ? 'opacity-60' : ''} />
          </button>
        {/each}
      </div>
    </div>

    <!-- Opacity -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Opacity</div>
      <div class="flex items-center gap-2">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={selectedElement?.opacity ?? 1}
          oninput={(e) => updateSelected({ opacity: parseFloat((e.target as HTMLInputElement).value) })}
          class="flex-1 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <span class="w-8 text-right text-gray-600">{Math.round((selectedElement?.opacity ?? 1) * 100)}</span>
      </div>
    </div>

    <!-- Layers -->
    <div class="mb-3">
      <div class="text-gray-500 mb-1.5">Layers</div>
      <div class="flex gap-1">
        <button class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Send to back">
          <ChevronsDown size={14} />
        </button>
        <button class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Send backward">
          <ChevronDown size={14} />
        </button>
        <button class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Bring forward">
          <ChevronUp size={14} />
        </button>
        <button class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50" title="Bring to front">
          <ChevronsUp size={14} />
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div>
      <div class="text-gray-500 mb-1.5">Actions</div>
      <div class="flex gap-1">
        <button
          class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-gray-50"
          onclick={duplicateSelected}
          title="Duplicate"
        >
          <Copy size={14} />
        </button>
        <button
          class="flex-1 h-7 rounded border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          onclick={deleteSelected}
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  </div>
{/if}
