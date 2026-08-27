import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react'
import proxyOptions, { previewProxyOptions } from './proxyOptions';
import { decodeCredit } from './src/lib/credit';
import { getLeaderboard } from './scripts/git-leaderboard';

// Computed once per `vite`/`vite build`/`vite preview` invocation (this file
// is re-evaluated fresh each time), so the leaderboard is current on every
// run without needing a separate build step. See scripts/git-leaderboard.cjs
// for the "keep the previous record on error" fallback behavior.
const GIT_LEADERBOARD = getLeaderboard();

// rollupOptions.output.banner is silently dropped by Vite's build pipeline
// (confirmed: a bare Rollup build honors it, but going through `vite build`
// does not), so inject the credit banner directly into the final bundle
// instead, via generateBundle — the last hook before files are written.
function creditBannerPlugin(): Plugin {
    return {
        name: 'credit-banner',
        generateBundle(_options, bundle) {
            const banner = `/*! Developed by ${decodeCredit()} */\n`;
            for (const file of Object.values(bundle)) {
                if (file.type === 'chunk') {
                    file.code = banner + file.code;
                }
            }
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
    // Nginx fronts the dev server at https://pragati.iitg.ac.in/dev/ (see
    // server.allowedHosts below), so dev-mode asset/HMR requests need the
    // /dev/ prefix. Production keeps the default root base, unchanged.
    base: mode === 'development' ? '/dev/' : '/',
    define: {
        // `define` substitutes this identifier with raw source code, not an
        // auto-quoted value — so the object must be JSON.stringify'd twice:
        // once to serialize it, once more to produce a valid quoted JS string
        // literal (what src/lib/leaderboard.ts's JSON.parse expects).
        __GIT_LEADERBOARD__: JSON.stringify(JSON.stringify(GIT_LEADERBOARD)),
    },
    plugins: [react(), creditBannerPlugin()],
    server: {
        port: 8081,
        host: '0.0.0.0',
        // Nginx fronts this dev server as http://pragati.iitg.ac.in ->
        // http://172.16.135.118:8081. Vite rejects requests whose Host header
        // isn't recognized, so the proxied domain must be explicitly allowed.
        allowedHosts: ['pragati.iitg.ac.in'],
        hmr: {
            // No clientPort override: let the HMR client infer the port from
            // window.location, so it connects back through Nginx on whatever
            // port the page was loaded on (80 for http://pragati.iitg.ac.in)
            // instead of trying to dial 8081 directly. Nginx must forward the
            // Upgrade/Connection headers for this /?token= websocket to reach
            // the dev server, e.g.:
            //   location / {
            //       proxy_pass http://172.16.135.118:8081;
            //       proxy_http_version 1.1;
            //       proxy_set_header Upgrade $http_upgrade;
            //       proxy_set_header Connection "upgrade";
            //       proxy_set_header Host $host;
            //   }
        },
        proxy: proxyOptions
    },
    preview: {
        // vite preview (used by deploy-prod.sh under PM2) listens on the same
        // port 8081 and enforces the same Host allow-list.
        allowedHosts: ['pragati.iitg.ac.in'],
        proxy: previewProxyOptions
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    },
    build: {
        target: 'es2015',
    },
}));

