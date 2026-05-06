const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class N8nService {
  constructor() {
    this.process = null;
    this.isReady = false;
    this.port = process.env.N8N_PORT || 5678;
    this.startupTimeout = 60000; // 60 seconds
  }

  async start() {
    if (this.process) {
      console.log('n8n is already running');
      return;
    }

    // Validate n8n binary exists
    const n8nPath = path.join(process.cwd(), 'node_modules', '.bin', 'n8n');
    if (!fs.existsSync(n8nPath)) {
      throw new Error(`n8n binary not found at ${n8nPath}. Run: npm install`);
    }

    // Validate required environment variables
    if (!process.env.N8N_ENCRYPTION_KEY) {
      throw new Error('N8N_ENCRYPTION_KEY is required. Generate one with: openssl rand -hex 16');
    }
    if (!process.env.N8N_BASIC_AUTH_PASSWORD) {
      throw new Error('N8N_BASIC_AUTH_PASSWORD is required for security');
    }

    return new Promise((resolve, reject) => {
      console.log(`🔄 Starting n8n on port ${this.port}...`);
      const env = {
        ...process.env,
        N8N_PORT: this.port,
        // Use HTTP for internal communication
        N8N_PROTOCOL: 'http',
        N8N_HOST: process.env.N8N_HOST || '127.0.0.1',
        // n8n runs with /n8n/ base path so URLs are generated correctly
        N8N_PATH: '/n8n/',
        N8N_EDITOR_BASE_URL: process.env.N8N_EDITOR_BASE_URL || 'http://localhost:5001/n8n/',
        WEBHOOK_URL: process.env.WEBHOOK_URL || 'http://localhost:5001/n8n/webhook/',
        // Use ws (not wss) for local HTTP development
        N8N_ENDPOINT_WEBSOCKET: process.env.N8N_ENDPOINT_WEBSOCKET || 'ws',
        N8N_BASIC_AUTH_ACTIVE: process.env.N8N_BASIC_AUTH_ACTIVE || 'true',
        N8N_BASIC_AUTH_USER: process.env.N8N_BASIC_AUTH_USER,
        N8N_BASIC_AUTH_PASSWORD: process.env.N8N_BASIC_AUTH_PASSWORD,
        N8N_ENCRYPTION_KEY: process.env.N8N_ENCRYPTION_KEY,
        // Disable secure auth cookie for HTTP development
        N8N_SECURE_AUTH_COOKIE: 'false',
        DB_TYPE: 'postgresdb',
        DB_POSTGRESDB_HOST: process.env.N8N_DB_HOST || process.env.PORTFOLIO_DB_HOST || process.env.POSTGRES_HOST,
        DB_POSTGRESDB_PORT: process.env.N8N_DB_PORT || process.env.PORTFOLIO_DB_PORT || process.env.POSTGRES_PORT || '5432',
        DB_POSTGRESDB_DATABASE: process.env.N8N_DB_NAME || process.env.PORTFOLIO_DB_NAME || process.env.POSTGRES_DATABASE || 'n8n',
        DB_POSTGRESDB_USER: process.env.N8N_DB_USER || process.env.PORTFOLIO_DB_USER || process.env.POSTGRES_USERNAME,
        DB_POSTGRESDB_PASSWORD: process.env.N8N_DB_PASS || process.env.PORTFOLIO_DB_PASS || process.env.PORTFOLIO_DB_PASSWORD || process.env.POSTGRES_PASSWORD,
        DB_POSTGRESDB_SSL_ENABLED: process.env.N8N_DB_SSL_ENABLED || process.env.PORTFOLIO_DB_SSL || process.env.POSTGRES_SSL || 'true',
        DB_POSTGRESDB_SSL_REJECT_UNAUTHORIZED: process.env.N8N_DB_SSL_REJECT_UNAUTHORIZED || 'false',
        N8N_RUNNERS_ENABLED: 'true',
        N8N_HIDE_USAGE_PAGE: 'true',
        // Trust proxy headers for correct URL generation
        N8N_PROXY_HOPS: '1',
        N8N_BLOCK_ENV_ACCESS_IN_NODE: 'false',
        N8N_GIT_NODE_DISABLE_BARE_REPOS: 'true',
        N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS: 'false',
      };

      this.process = spawn(n8nPath, ['start'], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      // Ensure child process is killed when the main Node.js process exits
      process.on('exit', () => {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
      });

      let output = '';
      const startupTimer = setTimeout(() => {
        if (!this.isReady) {
          this.process.kill();
          reject(new Error('n8n startup timeout'));
        }
      }, this.startupTimeout);

      this.process.stdout.on('data', (data) => {
        const str = data.toString();
        output += str;
        console.log(`[n8n] ${str.trim()}`);

        // Check for ready signals
        if (str.includes('Editor is now accessible') || 
            str.includes('Server is listening') ||
            str.includes('n8n ready') ||
            str.includes('Started n8n')) {
          this.isReady = true;
          clearTimeout(startupTimer);
          console.log('✅ n8n is ready and listening on port ' + this.port);
          resolve();
        }
      });

      this.process.stderr.on('data', (data) => {
        const str = data.toString();
        console.error(`[n8n error] ${str.trim()}`);
      });

      this.process.on('error', (err) => {
        clearTimeout(startupTimer);
        console.error('❌ Failed to start n8n:', err);
        reject(err);
      });

      this.process.on('exit', (code) => {
        console.log(`n8n process exited with code ${code}`);
        this.process = null;
        this.isReady = false;
      });

      // Fallback: resolve after 30s if we haven't detected ready state
      setTimeout(() => {
        if (!this.isReady && this.process) {
          this.isReady = true;
          clearTimeout(startupTimer);
          console.log('✅ n8n assumed ready (fallback) after 30s');
          resolve();
        }
      }, 30000);
    });
  }

  async stop() {
    if (!this.process) {
      return;
    }

    console.log('🔄 Stopping n8n...');
    
    return new Promise((resolve) => {
      this.process.on('exit', () => {
        console.log('✅ n8n stopped');
        resolve();
      });

      // Try graceful shutdown first
      this.process.kill('SIGTERM');

      // Force kill after 10 seconds
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
      }, 10000);
    });
  }

  getStatus() {
    return {
      isRunning: !!this.process,
      isReady: this.isReady,
      port: this.port,
      pid: this.process ? this.process.pid : null,
    };
  }
}

module.exports = new N8nService();
