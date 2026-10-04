# Lumra — AI image studio

Lumra turns one reference into a whole, consistent image pack. Pick a tool or a
template, add a reference photo, and generate every scene of a pack in parallel
with Google Gemini image models.

Built with Vite, React, TypeScript, Tailwind CSS, shadcn/ui and Supabase.
The interface follows the Magnific-style design rules in
[`MAGNIFIC_CONVENTIONS.md`](./MAGNIFIC_CONVENTIONS.md).

## Highlights

- **Home** — greeting, global search, tool grid, recent creations, projects and credits.
- **Explore** — Discover / Use cases / Templates / Community. Opening a template
  deep-links into the right tool with the prompt filled in (`?prompt=`).
- **⌘K / Ctrl K command palette** — tools, templates, prompt ideas and quick actions from anywhere.
- **Packs, Pack Creator, Bulk Generator, Text to Image, Prompt / Quote generators, Glasses try-on.**
- **Library, Styles and Usage & cost** pages.
- Notifications, onboarding toast and a three-step guided tour.
- Light and dark themes, mobile layout with bottom navigation.

## Demo mode

Anyone can tour the product without an account:

- open the app with `?demo=1`, or
- press **Explore the demo** on the sign-in page.

Demo mode signs in a sample user and fills empty pages with sample content
(`src/data/mock.ts`, images in `src/assets/mock`). Reads return nothing, and
writes / generations are blocked with a "sign in to save" message — see
`src/lib/demo.ts`. Signing out (or `?demo=0`) leaves demo mode.

## Develop

```sh
bun install      # or npm install
bun run dev      # http://localhost:8080
npx tsc -p tsconfig.app.json --noEmit
bun run lint
```

Environment variables (`.env`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`. Edge functions live in `supabase/functions`.

## Brand

The Lumra mark is a lowercase “l” next to a glowing orb of light
(`src/components/brand/Logo.tsx`, `public/favicon.svg`). Fonts: Geist and Geist Mono
(SIL Open Font License), self-hosted in `public/fonts`.
