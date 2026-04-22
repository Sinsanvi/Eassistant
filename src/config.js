const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();

class Config {
  constructor() {
    this.configPath = path.join(process.cwd(), 'config.json');
    this.prioritiesPath = process.env.PRIORITIES_PATH || path.join(process.cwd(), 'priorities.md');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      const configFile = fs.readJsonSync(this.configPath);
      
      // Override with environment variables if present
      return {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID || configFile.google.clientId,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || configFile.google.clientSecret,
          redirectUri: configFile.google.redirectUri,
          refreshToken: process.env.GOOGLE_REFRESH_TOKEN || configFile.google.refreshToken
        },
        email: {
          service: configFile.email.service,
          user: process.env.EMAIL_USER || configFile.email.user,
          password: process.env.EMAIL_PASSWORD || configFile.email.password
        },
        ai: {
          provider: configFile.ai.provider,
          apiKey: process.env.HF_API_KEY || configFile.ai.apiKey,
          model: configFile.ai.model
        },
        scheduling: configFile.scheduling,
        prioritiesDocumentPath: this.prioritiesPath,
        notification: {
          recipientEmail: process.env.NOTIFICATION_EMAIL || configFile.notification.recipientEmail
        }
      };
    } catch (error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
  }

  get(key) {
    return key.split('.').reduce((obj, k) => obj && obj[k], this.config);
  }

  async loadPriorities() {
    try {
      if (fs.existsSync(this.prioritiesPath)) {
        return await fs.readFile(this.prioritiesPath, 'utf-8');
      }
      return null;
    } catch (error) {
      console.warn(`Could not load priorities document: ${error.message}`);
      return null;
    }
  }
}

module.exports = new Config();