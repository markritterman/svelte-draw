# svelte-draw

Excalidraw-style drawing app built with Svelte 5, Vite, and Rough.js.

## Stack

- **Svelte 5** with runes (`$state`, `$derived`, `$effect`)
- **Vite** for bundling (no SvelteKit)
- **Rough.js** for hand-drawn style rendering
- **Tailwind CSS 4** + shadcn-svelte (planned)

## Dev Server

```bash
npm run dev
```

Runs on http://localhost:5179

## Key Files

- `src/components/Canvas.svelte` - Main drawing canvas
- `src/state/` - Runes-based state (`.svelte.ts` files)
- `plan.md` - Full implementation plan
