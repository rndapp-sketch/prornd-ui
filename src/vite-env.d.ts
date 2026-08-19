/// <reference types="vite/client" />

// Injected by vite.config.ts's `define`, computed fresh each dev/build/preview
// run by scripts/git-leaderboard.cjs. See src/lib/leaderboard.ts for the
// parsed shape.
declare const __GIT_LEADERBOARD__: string;
