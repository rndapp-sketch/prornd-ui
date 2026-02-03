
// production proxy options
// const common_site_config = require('../../../sites/common_site_config.json');

// development proxy options
const common_site_config = require('./common_site_config.json');


const { webserver_port } = common_site_config;

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://172.16.135.27:${webserver_port}`,
		ws: true,
		router: function (req) {
			// Always use the correct server IP
			return `http://172.16.135.27:${webserver_port}`;
		}
	},
	// Proxy for external Ledger API to avoid CORS
	'/ledger-api': {
		target: 'http://172.16.135.27:18083',
		changeOrigin: true,
		rewrite: (path: string) => path.replace(/^\/ledger-api/, '/api'),
	}
};
