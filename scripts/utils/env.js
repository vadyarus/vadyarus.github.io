// --- Environment Configuration Utility ---
// Detect if we are running locally (Live Server) or on Production
// We check for typical local hostnames
const isLocal = ['127.0.0.1', 'localhost', '::1'].includes(window.location.hostname);

// Global extension helper: use '.html' locally, empty string '' on production
const ext = isLocal ? '.html' : '';

// Export the configuration
export { isLocal, ext };

// Global extension helper: use '.html' locally, empty string '' on production
window.PAGE_EXT = isLocal ? '.html' : '';