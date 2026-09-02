// Computes a commit-count leaderboard across every branch (local + remote)
// in this repo, run once per `vite` invocation (dev server start or build).
// Best-effort: a fresh `git fetch` is attempted so remote branches are
// current, but a failed fetch doesn't block the leaderboard — it just falls
// back to whatever refs are already known locally. If git itself is
// unavailable (e.g. running from a source tarball with no .git directory),
// the last successfully computed result is read back from the on-disk
// cache instead of breaking the build.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface Contributor {
    name: string;
    email: string;
    commits: number;
    percentage: number;
}

interface Leaderboard {
    generatedAt: string | null;
    totalCommits: number;
    contributors: Contributor[];
    stale: boolean;
    error?: string;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, '..', '.leaderboard-cache.json');

function run(cmd: string): string {
    return execSync(cmd, { cwd: path.resolve(__dirname, '..'), encoding: 'utf8', timeout: 15000 });
}

function computeFresh(): Leaderboard {
    // This repo (and its production clones — see the `git clone -b ...
    // --single-branch` in ecosystem.config.cjs) is often cloned with
    // --single-branch, which narrows origin's fetch refspec to just that one
    // branch (visible via `git config remote.origin.fetch`). Under that
    // refspec, `git fetch --all` silently only updates already-known
    // branches and never discovers new ones — so `git shortlog --all` can
    // massively undercount contributors whose commits only live on branches
    // that were never fetched. Widen the refspec first so every branch on
    // the remote actually gets pulled. Best-effort: network/permission
    // failures here must not fail the whole computation.
    try {
        run('git config remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"');
        run('git fetch origin --quiet');
    } catch {
        // offline / no remote access — proceed with whatever refs exist locally
    }

    const raw = run('git shortlog -sne --all');

    // Merge entries that share an email but differ in name casing/spelling
    // (e.g. "Okramjimmy" vs "okramjimmy"), keeping the most-used display name.
    const byEmail = new Map<string, { email: string; commits: number; names: Map<string, number> }>();
    for (const line of raw.split('\n')) {
        const match = line.match(/^\s*(\d+)\s+(.*?)\s+<(.+?)>\s*$/);
        if (!match) continue;
        const [, countStr, name, email] = match;
        const count = parseInt(countStr, 10);
        const key = email.toLowerCase();
        const entry = byEmail.get(key) || { email, commits: 0, names: new Map<string, number>() };
        entry.commits += count;
        entry.names.set(name, (entry.names.get(name) || 0) + count);
        byEmail.set(key, entry);
    }

    // Some contributors committed with a malformed git config — an email
    // with no "@" (really just a username, e.g. "rndops <priyam96>") — so
    // git counts them as a separate identity from their real one. Detect
    // these automatically (no hardcoded per-person table) and fold them into
    // whichever real contributor's email local-part looks like the same
    // person: either one contains the other (e.g. "jdoe" ~ "jdoe.dev"), or
    // they share a long common prefix (e.g. "priyam96" ~ "priyamkurmi" —
    // same "priyam" stem, different suffix).
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const commonPrefixLength = (a: string, b: string) => {
        let i = 0;
        while (i < a.length && i < b.length && a[i] === b[i]) i++;
        return i;
    };
    const MIN_MATCH_LENGTH = 4;
    const malformedKeys = Array.from(byEmail.keys()).filter((k) => !k.includes('@'));
    const wellFormedKeys = Array.from(byEmail.keys()).filter((k) => k.includes('@'));
    for (const key of malformedKeys) {
        const entry = byEmail.get(key)!;
        const normKey = normalize(key);
        const match = wellFormedKeys.find((wfKey) => {
            const localPart = normalize(wfKey.split('@')[0]);
            if (normKey.length < MIN_MATCH_LENGTH || localPart.length < MIN_MATCH_LENGTH) return false;
            if (localPart.includes(normKey) || normKey.includes(localPart)) return true;
            return commonPrefixLength(normKey, localPart) >= MIN_MATCH_LENGTH + 2;
        });
        if (!match) continue;
        // Fold the commit count in, but don't let the malformed identity's
        // name (often a shared role account like "rndops", not the person's
        // actual name) outvote the real identity's name for display.
        const target = byEmail.get(match)!;
        target.commits += entry.commits;
        byEmail.delete(key);
    }

    const contributors: Contributor[] = Array.from(byEmail.values()).map((entry) => {
        const name = Array.from(entry.names.entries()).sort((a, b) => b[1] - a[1])[0][0];
        return { name, email: entry.email, commits: entry.commits, percentage: 0 };
    });

    const total = contributors.reduce((sum, c) => sum + c.commits, 0);
    contributors.sort((a, b) => b.commits - a.commits);
    for (const c of contributors) {
        c.percentage = total > 0 ? Math.round((c.commits / total) * 1000) / 10 : 0;
    }

    return {
        generatedAt: new Date().toISOString(),
        totalCommits: total,
        contributors,
        stale: false,
    };
}

export function getLeaderboard(): Leaderboard {
    try {
        const result = computeFresh();
        try {
            fs.writeFileSync(CACHE_PATH, JSON.stringify(result, null, 2));
        } catch {
            // read-only filesystem or similar — non-fatal, we still have the result
        }
        return result;
    } catch (err) {
        // git unavailable / not a git repo / command failed — fall back to the
        // last successfully computed record rather than breaking the build.
        try {
            const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')) as Leaderboard;
            return { ...cached, stale: true };
        } catch {
            return {
                generatedAt: null,
                totalCommits: 0,
                contributors: [],
                stale: true,
                error: err instanceof Error ? err.message : String(err),
            };
        }
    }
}
