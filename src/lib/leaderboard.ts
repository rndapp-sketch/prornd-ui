export interface LeaderboardEntry {
    name: string;
    email: string;
    commits: number;
    percentage: number;
}

export interface Leaderboard {
    generatedAt: string | null;
    totalCommits: number;
    contributors: LeaderboardEntry[];
    // true when this run couldn't recompute (e.g. no .git available at build
    // time) and fell back to the last successfully cached record.
    stale: boolean;
    error?: string;
}

const EMPTY_LEADERBOARD: Leaderboard = {
    generatedAt: null,
    totalCommits: 0,
    contributors: [],
    stale: true,
};

export function getGitLeaderboard(): Leaderboard {
    try {
        return JSON.parse(__GIT_LEADERBOARD__) as Leaderboard;
    } catch {
        return EMPTY_LEADERBOARD;
    }
}
