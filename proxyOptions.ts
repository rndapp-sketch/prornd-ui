// // production proxy options
// // const common_site_config = require('../../../sites/common_site_config.json');

// // development proxy options
// const common_site_config = require('./common_site_config.json');

// const { webserver_port } = common_site_config;

// export default {
// 	'^/(app|api|assets|files|private)': {
// 		target: `http://172.16.134.81:${webserver_port}`,
// 		ws: true,
// 		router: function (req) {
// 			// Always use the correct server IP
// 			return `http://172.16.134.81:${webserver_port}`;
// 		}
// 	},
// 	// Proxy for external Ledger API to avoid CORS
// 	'/ledger-api': {
// 		target: 'http://172.16.134.81:18083',
// 		changeOrigin: true,
// 		rewrite: (path: string) => path.replace(/^\/ledger-api/, '/api'),
// 	}
// };

// production proxy options
// const common_site_config = require('../../../sites/common_site_config.json');
// ================================
// development proxy options
import { loadEnv } from "vite";

const common_site_config = require("./common_site_config.json");

const { webserver_port } = common_site_config;

// proxyOptions.ts is loaded as a plain Node/CJS module by vite.config.ts,
// before Vite's own env-loading pipeline runs, so import.meta.env is not
// available here. Use Vite's loadEnv helper (works outside a running config
// too) to read the same .env / .env.production files the rest of the app
// uses, keeping these proxy targets in sync with VITE_*_HOST.
const mode = process.env.NODE_ENV === "production" ? "production" : "development";
const env = loadEnv(mode, process.cwd(), "VITE_");

// The app backend's *port* deliberately keeps using webserver_port from
// common_site_config.json (see below) rather than a VITE_*_PORT env var.
const APP_BACKEND_HOST = env.VITE_APP_BACKEND_HOST || "172.16.131.206";
const LEDGER_HOST = env.VITE_LEDGER_HOST || "172.16.134.81";
const LEDGER_PORT = env.VITE_LEDGER_PORT || "18080";
const MINIO_HOST = env.VITE_MINIO_HOST || "172.16.135.118";
const MINIO_PORT = env.VITE_MINIO_PORT || "9000";
const APPWRITE_HOST = env.VITE_APPWRITE_HOST || "172.16.134.179";
const APPWRITE_PORT = env.VITE_APPWRITE_PORT || "9080";
const ATTENDANCE_HOST = env.VITE_ATTENDANCE_HOST || "172.16.135.27";
const ATTENDANCE_PORT = env.VITE_ATTENDANCE_PORT || "7078";

const sharedProxyEntries = {
  // Proxy for external Ledger API to avoid CORS
  "/ledger-api": {
    target: `http://${LEDGER_HOST}:${LEDGER_PORT}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ledger-api/, "/api"), // Type annotation removed for JS config compatibility
    headers: {
      Origin: `http://${LEDGER_HOST}:${LEDGER_PORT}`,
      Referer: `http://${LEDGER_HOST}:${LEDGER_PORT}/`,
    }
  },
  // Proxy for MinIO file storage
  "/prod-rnd-files": {
    target: `http://${MINIO_HOST}:${MINIO_PORT}`,
    changeOrigin: true,
  },
  // Proxy for Appwrite (messaging backend) to avoid CORS in dev
  // Browser hits /appwrite/v1/... and Vite forwards to the Appwrite endpoint
  "/appwrite": {
    target: `http://${APPWRITE_HOST}:${APPWRITE_PORT}`,
    changeOrigin: true,
    ws: true,
    rewrite: (path: string) => path.replace(/^\/appwrite/, ""),
  },
  // Proxy for Attendance API (PresenceBackend) to avoid CORS in dev
  "/attendance-api": {
    target: `http://${ATTENDANCE_HOST}:${ATTENDANCE_PORT}`,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/attendance-api/, "/api"),
  },
  // Proxy for external Candidate Recruitment API to avoid CORS in dev.
  // The recruitment portal's document /view endpoint does not send
  // Access-Control-Allow-Origin, so browser fetch() for binary downloads
  // (e.g. bulk resume zip) gets blocked unless routed same-origin.
  "/candidate-api": {
    target: "https://iitg.ac.in",
    changeOrigin: true,
    secure: true,
    rewrite: (path: string) => path.replace(/^\/candidate-api/, "/rndproj/recruitment"),
  },
};

const appBackendProxy = {
  // target: `http://172.16.134.81:${webserver_port}`,
  target: `http://${APP_BACKEND_HOST}:${webserver_port}`,
  ws: true,
  // CRITICAL ADDITION: This changes the Host header to match the target (172.16.135.27)
  // This ensures Frappe recognizes the request context correctly.
  changeOrigin: true,
  secure: false,
  xfwd: true,
  timeout: 60000,
  proxyTimeout: 60000,

  router: function (req: string) {
    // Always use the correct server IP
    // return `http://172.16.134.81:${webserver_port}`;
    return `http://${APP_BACKEND_HOST}:${webserver_port}`;
  },
};

export default {
  "^/(app|api|assets|files|private)(/|$)": appBackendProxy,
  ...sharedProxyEntries,
};

// vite preview (`vite preview --mode production`, used by deploy-prod.sh) falls
// back to this same server.proxy config if no preview-specific proxy is given.
// That's a problem: the built SPA's own bundle is served from /assets/*, which
// collides with the "/assets" prefix meant for Frappe's own static assets — so
// without this override, vite preview proxies our own JS/CSS bundle away to the
// Frappe backend instead of serving it from disk. Preview therefore excludes
// "assets" from the proxied prefixes; everything else behaves the same as dev.
export const previewProxyOptions = {
  "^/(app|api|files|private)(/|$)": appBackendProxy,
  ...sharedProxyEntries,
};

// ========================
//

// const common_site_config = require("./common_site_config.json");

// const { webserver_port } = common_site_config;

// const BACKEND = `http://172.16.117.39:${webserver_port}`;

// export default {
//     // ✅ Support BOTH dev (/api) and prod-like (/rndproj/prornd/api)
//     "^/(app|api|assets|files|private)": {
//         target: BACKEND,
//         changeOrigin: true,
//         secure: false,
//         ws: true,
//         timeout: 60000,
//         proxyTimeout: 60000,
//     },

//     "^/rndproj/prornd/(app|api|assets|files|private)": {
//         target: BACKEND,
//         changeOrigin: true,
//         secure: false,
//         ws: true,

//         // 🔥 THIS is critical — strip the prefix
//         rewrite: (path) => path.replace(/^\/rndproj\/prornd/, ""),
//     },

//     // ✅ Socket.IO (you were missing this completely)
//     "^/(socket.io)": {
//         target: BACKEND,
//         ws: true,
//         changeOrigin: true,
//     },

//     "^/rndproj/prornd/socket.io": {
//         target: BACKEND,
//         ws: true,
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/rndproj\/prornd/, ""),
//     },

//     // Ledger API
//     "/ledger-api": {
//         target: "http://172.16.134.81:18083",
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/ledger-api/, "/api"),
//     },

//     // MinIO
//     "/prod-rnd-files": {
//         target: "http://172.16.135.118:9000",
//         changeOrigin: true,
//     },
// };
