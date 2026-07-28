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
const common_site_config = require("./common_site_config.json");

const { webserver_port } = common_site_config;

export default {
  "^/(app|api|assets|files|private)(/|$)": {
    // target: `http://172.16.134.81:${webserver_port}`,
    target: `http://172.16.131.206:${webserver_port}`,
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
      return `http://172.16.131.206:${webserver_port}`;
    },
  },
  // Proxy for external Ledger API to avoid CORS
  "/ledger-api": {
    target: "http://172.16.134.81:18080",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ledger-api/, "/api"), // Type annotation removed for JS config compatibility
    headers: {
      Origin: "http://172.16.134.81:18080",
      Referer: "http://172.16.134.81:18080/",
    }
  },
  // Proxy for MinIO file storage
  "/prod-rnd-files": {
    target: "http://172.16.135.118:9000",
    changeOrigin: true,
  },
  // Proxy for Appwrite (messaging backend) to avoid CORS in dev
  // Browser hits /appwrite/v1/... and Vite forwards to the Appwrite endpoint
  "/appwrite": {
    target: "http://172.16.134.179:9080",
    changeOrigin: true,
    ws: true,
    rewrite: (path: string) => path.replace(/^\/appwrite/, ""),
  },
  // Proxy for Attendance API (PresenceBackend) to avoid CORS in dev
  "/attendance-api": {
    target: "http://172.16.135.27:7078",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/attendance-api/, "/api"),
  },
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
