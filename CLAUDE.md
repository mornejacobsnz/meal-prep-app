@AGENTS.md

# meal-prep-app — Deploy Rules

**NEVER run `vercel --prod` without explicit confirmation from Morne.**

This app has real users (Morne's wife) with Supabase-stored data. An untested Supabase query change caused her recipes to disappear in production.

Safe deploy flow:
1. Make the change
2. Run `vercel` (preview) — verify at the preview URL that data loads (recipes, favourites, weekly plan)
3. Only run `vercel --prod` when Morne explicitly says to ship/deploy

This gate applies to ANY change touching:
- `lib/household.ts` — Supabase queries
- `app/page.tsx` `loadFromSync` — data load on mount
- `lib/storage.ts` — localStorage/cache logic
- `app/api/generate-recipes/route.ts` — recipe generation
