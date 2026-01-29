<script lang="ts">
  import Canvas from './components/Canvas.svelte';
  import Toolbar from './components/Toolbar.svelte';
  import DebugPanel from './components/DebugPanel.svelte';
</script>

<main class="w-screen h-screen overflow-hidden">
  <Canvas />
  <Toolbar />
  <DebugPanel />
</main>
