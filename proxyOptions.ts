
const common_site_config = require("./common_site_config.json");

const { webserver_port } = common_site_config;

export default {
  "^/(app|api|assets|files|private)(/|$)": {
    // target: `http://172.16.134.81:${webserver_port}`,
    target: `http://172.16.135.157:${webserver_port}`,
    ws: true,
    // CRITICAL ADDITION: This changes the Host header to match the target (172.16.135.27)
    // This ensures Frappe recognizes the request context correctly.
    changeOrigin: true,
    secure: false,
    timeout: 60000,
    proxyTimeout: 60000,

    router: function (req: string) {
      // Always use the correct server IP
      // return `http://172.16.134.81:${webserver_port}`;
      return `http://172.16.135.157:${webserver_port}`;
    },
  },
  // Proxy for external Ledger API to avoid CORS
  "/ledger-api": {
     target: "http://172.16.135.27:18083",
    //target: "http://172.16.134.81:18080",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/ledger-api/, "/api"), // Type annotation removed for JS config compatibility
  },
  // Proxy for MinIO file storage
  "/prod-rnd-files": {
    // target: "http://172.16.135.118:9000",
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


