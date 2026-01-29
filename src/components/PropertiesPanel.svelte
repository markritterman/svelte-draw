<script lang="ts">
  import { elementsState } from '../state/elements.svelte';
  import {
    Minus,
    MoreHorizontal,
    Ellipsis,
    Waves,
    ArrowRight,
    ArrowLeft,
    Copy,
    Trash2,
    ChevronDown,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
    Circle,
    X,
    Link,
    Unlink,
  } from 'lucide-svelte';
  import type { ArrowElement, LineElement, ArrowLineType } from '../types/element';

  const strokeColors = ['#1e293b', '#dc2626', '#16a34a', '#2563eb', '#d97706', '#000000'];
  const bgColors = ['transparent', '#fee2e2', '#dcfce7', '#dbeafe', '#fef3c7', '#e0f2fe'];

  // Get first selected element for display (shows its properties, changes apply to all)
  let selectedElement = $derived(
    elementsState.selectedIds.size > 0
      ? elementsState.getElementById([...elementsState.selectedIds][0])
      : null
  );

  let hasSelection = $derived(elementsState.selectedIds.size > 0);
  let selectionCount = $derived(elementsState.selectedIds.size);
  let hasArrowSelected = $derived(selectedElement?.type === 'arrow');
  let hasLineOrArrowSelected = $derived(selectedElement?.type === 'arrow' || selectedElement?.type === 'line');

  // Check if selected arrow/line has bindings
  let startBinding = $derived(
    hasLineOrArrowSelected ? (selectedElement as ArrowElement | LineElement).startBinding : null
  );
  let endBinding = $derived(
    hasLineOrArrowSelected ? (selectedElement as ArrowElement | LineElement).endBinding : null
  );
  let hasAnyBinding = $derived(startBinding !== null || endBinding !== null);

  // Get the name/type of bound element
  function getBoundElementLabel(elementId: string): string {
    const el = elementsState.getElementById(elementId);
    if (!el) return 'Unknown';
    return el.type.charAt(0).toUpperCase() + el.type.slice(1);
  }

  type ArrowheadType = 'arrow' | 'bar' | 'dot' | null;

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
    {#if selectionCount > 1}
      <div class="mb-2 pb-2 border-b border-gray-100 text-gray-500">
        {selectionCount} elements selected
      </div>
    {/if}

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

    <!-- Arrow Line Type (only for arrow type) -->
    {#if hasArrowSelected}
      <div class="mb-3">
        <div class="text-gray-500 mb-1.5">Arrow type</div>
        <div class="flex gap-1">
          {#each ['sharp', 'curved', 'elbow'] as lineType}
            {@const isSelected = (selectedElement as ArrowElement)?.lineType === lineType}
            <button
              class="flex-1 h-7 rounded border flex items-center justify-center transition-all"
              class:bg-sky-100={isSelected}
              class:border-sky-500={isSelected}
              class:border-gray-200={!isSelected}
              class:hover:bg-gray-50={!isSelected}
              onclick={() => updateSelected({ lineType: lineType as ArrowLineType, controlPoints: [] })}
              title={lineType.charAt(0).toUpperCase() + lineType.slice(1)}
            >
              {#if lineType === 'sharp'}
                <!-- Straight diagonal line icon -->
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <line x1="3" y1="13" x2="13" y2="3" />
                </svg>
              {:else if lineType === 'curved'}
                <!-- Curved/wavy line icon -->
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 13 Q8 3 13 8" />
                </svg>
              {:else if lineType === 'elbow'}
                <!-- Right-angle connector icon -->
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M3 13 L3 8 L13 8 L13 3" />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Arrowheads (only for arrow type) -->
    {#if hasArrowSelected}
      <div class="mb-3">
        <div class="text-gray-500 mb-1.5">Arrowheads</div>
        <div class="flex gap-2">
          <!-- Start arrowhead -->
          <div class="flex-1">
            <div class="text-[10px] text-gray-400 mb-1">Start</div>
            <div class="flex gap-0.5">
              {#each [null, 'arrow', 'bar', 'dot'] as type}
                {@const isSelected = (selectedElement?.type === 'arrow' && (selectedElement as any).startArrowhead) === type}
                <button
                  class="flex-1 h-6 rounded border flex items-center justify-center transition-all text-[10px]"
                  class:bg-sky-100={isSelected}
                  class:border-sky-500={isSelected}
                  class:border-gray-200={!isSelected}
                  class:hover:bg-gray-50={!isSelected}
                  onclick={() => updateSelected({ startArrowhead: type as ArrowheadType })}
                  title={type ?? 'None'}
                >
                  {#if type === null}
                    <X size={10} />
                  {:else if type === 'arrow'}
                    <ArrowLeft size={10} />
                  {:else if type === 'bar'}
                    <span class="font-bold">|</span>
                  {:else if type === 'dot'}
                    <Circle size={8} class="fill-current" />
                  {/if}
                </button>
              {/each}
            </div>
          </div>
          <!-- End arrowhead -->
          <div class="flex-1">
            <div class="text-[10px] text-gray-400 mb-1">End</div>
            <div class="flex gap-0.5">
              {#each [null, 'arrow', 'bar', 'dot'] as type}
                {@const isSelected = (selectedElement?.type === 'arrow' && (selectedElement as any).endArrowhead) === type}
                <button
                  class="flex-1 h-6 rounded border flex items-center justify-center transition-all text-[10px]"
                  class:bg-sky-100={isSelected}
                  class:border-sky-500={isSelected}
                  class:border-gray-200={!isSelected}
                  class:hover:bg-gray-50={!isSelected}
                  onclick={() => updateSelected({ endArrowhead: type as ArrowheadType })}
                  title={type ?? 'None'}
                >
                  {#if type === null}
                    <X size={10} />
                  {:else if type === 'arrow'}
                    <ArrowRight size={10} />
                  {:else if type === 'bar'}
                    <span class="font-bold">|</span>
                  {:else if type === 'dot'}
                    <Circle size={8} class="fill-current" />
                  {/if}
                </button>
              {/each}
            </div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Bindings (for arrows and lines) -->
    {#if hasLineOrArrowSelected && hasAnyBinding}
      <div class="mb-3">
        <div class="text-gray-500 mb-1.5 flex items-center gap-1">
          <Link size={12} />
          Bindings
        </div>
        <div class="space-y-1.5">
          {#if startBinding}
            <div class="flex items-center justify-between bg-sky-50 rounded px-2 py-1.5 border border-sky-200">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-sky-600 font-medium">Start</span>
                <span class="text-gray-600">{getBoundElementLabel(startBinding.elementId)}</span>
              </div>
              <button
                class="p-0.5 rounded hover:bg-sky-200 text-sky-600 transition-colors"
                onclick={() => updateSelected({ startBinding: null })}
                title="Unpin start"
              >
                <Unlink size={12} />
              </button>
            </div>
          {/if}
          {#if endBinding}
            <div class="flex items-center justify-between bg-sky-50 rounded px-2 py-1.5 border border-sky-200">
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] text-sky-600 font-medium">End</span>
                <span class="text-gray-600">{getBoundElementLabel(endBinding.elementId)}</span>
              </div>
              <button
                class="p-0.5 rounded hover:bg-sky-200 text-sky-600 transition-colors"
                onclick={() => updateSelected({ endBinding: null })}
                title="Unpin end"
              >
                <Unlink size={12} />
              </button>
            </div>
          {/if}
        </div>
      </div>
    {/if}

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
