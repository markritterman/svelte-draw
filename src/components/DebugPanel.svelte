<script lang="ts">
  import { elementsState } from '../state/elements.svelte';
  import { toolsState } from '../state/tools.svelte';
  import { canvasState } from '../state/canvas.svelte';
  import { getElementBounds } from '../lib/bounds';

  let expanded = $state(true);
  let selectedElementId = $state<string | null>(null);

  // Update selected element when selection changes
  $effect(() => {
    const ids = [...elementsState.selectedIds];
    selectedElementId = ids.length === 1 ? ids[0] : null;
  });

  function copyToClipboard(text: string) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      // Fallback for non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }

  function formatValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'number') return value.toFixed(1);
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        if (value.length > 3) return `[${value.length} items]`;
        return JSON.stringify(value.map(v =>
          typeof v === 'object' ? `{x:${v.x?.toFixed(0)},y:${v.y?.toFixed(0)}}` : v
        ));
      }
      return JSON.stringify(value);
    }
    return String(value);
  }
</script>

<div class="fixed top-0 right-0 bottom-0 bg-gray-900 text-gray-100 text-xs font-mono z-50 flex">
  <!-- Toggle button -->
  <button
    class="w-6 bg-gray-800 hover:bg-gray-700 flex items-center justify-center"
    onclick={() => expanded = !expanded}
    title={expanded ? 'Collapse' : 'Expand'}
  >
    <span class="rotate-90">{expanded ? '▼' : '▲'}</span>
  </button>

  {#if expanded}
    <div class="w-72 flex flex-col">
      <!-- Header -->
      <div class="flex bg-gray-800 px-2 py-1 justify-between items-center gap-2">
        <span>Debug</span>
        <div class="flex gap-1">
          <button
            class="px-2 hover:bg-gray-700 text-yellow-400 rounded"
            onclick={() => (window as any).toggleHitAreas?.()}
            title="Toggle hit area visualization"
          >
            Hit
          </button>
          <button
            class="px-2 hover:bg-gray-700 text-sky-400 rounded"
            onclick={() => copyToClipboard(JSON.stringify(elementsState.elements, null, 2))}
            title="Copy elements JSON"
          >
            Copy
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-auto p-2">
        <!-- Canvas State -->
        <div class="mb-3">
          <div class="text-gray-400 mb-1">Canvas</div>
          <div class="space-y-0.5">
            <div>offset: ({canvasState.offset.x.toFixed(0)}, {canvasState.offset.y.toFixed(0)})</div>
            <div>scale: {canvasState.scale.toFixed(2)}</div>
            <div>tool: {toolsState.activeTool}</div>
          </div>
        </div>

        <!-- Elements List -->
        <div class="mb-3">
          <div class="text-gray-400 mb-1">Elements ({elementsState.elements.length})</div>
          <div class="space-y-1">
            {#each elementsState.elements as el}
              <button
                class="w-full text-left p-1 rounded hover:bg-gray-800"
                class:bg-sky-900={elementsState.selectedIds.has(el.id)}
                onclick={() => elementsState.select(el.id)}
              >
                <div class="flex gap-2 flex-wrap">
                  <span class="text-sky-400">{el.type}</span>
                  <span class="text-gray-500">{el.id.slice(0, 8)}</span>
                </div>
                <div class="text-gray-400">
                  x:{el.x.toFixed(0)} y:{el.y.toFixed(0)} w:{el.width.toFixed(0)} h:{el.height.toFixed(0)}
                </div>
                <div class="text-orange-400 text-[10px]">
                  bounds: ({getElementBounds(el).minX.toFixed(0)},{getElementBounds(el).minY.toFixed(0)}) → ({getElementBounds(el).maxX.toFixed(0)},{getElementBounds(el).maxY.toFixed(0)})
                </div>
                {#if el.type === 'line' || el.type === 'arrow'}
                  <div class="text-gray-500">
                    <div>pts: {formatValue((el as any).points)}</div>
                    {#if (el as any).startBinding}
                      <span class="text-green-400">start→{(el as any).startBinding.elementId.slice(0, 8)}</span>
                    {/if}
                    {#if (el as any).endBinding}
                      <span class="text-green-400 ml-1">end→{(el as any).endBinding.elementId.slice(0, 8)}</span>
                    {/if}
                  </div>
                {/if}
              </button>
            {/each}
          </div>
        </div>

        <!-- Selected Element Details -->
        {#if selectedElementId}
          {@const el = elementsState.getElementById(selectedElementId)}
          {#if el}
            <div>
              <div class="text-gray-400 mb-1">Selected</div>
              <div class="space-y-0.5">
                {#each Object.entries(el) as [key, value]}
                  <div class="flex gap-2">
                    <span class="text-gray-500 shrink-0">{key}:</span>
                    <span class="truncate">{formatValue(value)}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        {/if}
      </div>
    </div>
  {/if}
</div>
