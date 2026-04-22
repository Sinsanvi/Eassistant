#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const readline = require('readline');
const { google } = require('googleapis');

class EAssistantSetup {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.config = {};
  }

  async run() {
    console.log(`
🤖 Welcome to EAssistant Setup!

This interactive setup will help you configure:
- Google API credentials (Gmail & Calendar)
- Email configuration
- AI service settings
- Schedule preferences

Let's get started!
`);

    try {
      await this.setupGoogleAPI();
      await this.setupEmailConfig();
      await this.setupAIService();
      await this.setupScheduling();
      await this.setupPriorities();
      await this.saveConfiguration();
      await this.testConfiguration();
      
      console.log(`
🎉 Setup completed successfully!

Next steps:
1. Run 'npm start test' to verify connections
2. Run 'npm start summary' for immediate summary
3. Run 'npm run schedule start' for automatic scheduling

Happy automating! 🚀
`);
      
    } catch (error) {
      console.error('\n❌ Setup failed:', error.message);
      console.log('\nPlease check the README.md for manual setup instructions.');
    } finally {
      this.rl.close();
    }
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async setupGoogleAPI() {
    console.log('\n📧 Google API Configuration');
    console.log('You need to create Google Cloud credentials first.');
    console.log('See README.md for detailed instructions.\n');

    const hasCredentials = await this.question('Do you have Google Cloud OAuth credentials? (y/n): ');
    
    if (hasCredentials.toLowerCase() !== 'y') {
      console.log(`
Please follow these steps:
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Gmail API and Calendar API
4. Create OAuth 2.0 credentials
5. Generate refresh token using OAuth Playground

See README.md for detailed instructions.
`);
      process.exit(1);
    }

    this.config.google = {
      clientId: await this.question('Enter Google Client ID: '),
      clientSecret: await this.question('Enter Google Client Secret: '),
      redirectUri: 'http://localhost:3000/oauth2callback',
      refreshToken: await this.question('Enter Google Refresh Token: ')
    };

    // Test Google API connection
    console.log('\n🔧 Testing Google API connection...');
    try {
      const oauth2Client = new google.auth.OAuth2(
        this.config.google.clientId,
        this.config.google.clientSecret,
        this.config.google.redirectUri
      );

      oauth2Client.setCredentials({
        refresh_token: this.config.google.refreshToken
      });

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      await gmail.users.getProfile({ userId: 'me' });
      
      console.log('✅ Google API connection successful!');
    } catch (error) {
      console.log('❌ Google API test failed:', error.message);
      const retry = await this.question('Continue anyway? (y/n): ');
      if (retry.toLowerCase() !== 'y') {
        process.exit(1);
      }
    }
  }

  async setupEmailConfig() {
    console.log('\n📬 Email Configuration');
    console.log('Configure email sending for summary notifications.\n');

    this.config.email = {
      service: 'gmail',
      user: await this.question('Enter your Gmail address: '),
      password: await this.question('Enter Gmail app password (not account password): ')
    };

    this.config.notification = {
      recipientEmail: await this.question('Enter notification recipient email: ')
    };

    console.log('\n💡 Tip: Use Gmail app passwords for security.');
    console.log('Enable 2FA and create an app password in Google Account settings.');
  }

  async setupAIService() {
    console.log('\n🤖 AI Service Configuration');
    console.log('Using free Hugging Face API for AI summarization.\n');

    const hasHF = await this.question('Do you have a Hugging Face API key? (y/n): ');
    
    if (hasHF.toLowerCase() === 'y') {
      this.config.ai = {
        provider: 'huggingface',
        apiKey: await this.question('Enter Hugging Face API key: '),
        model: 'facebook/bart-large-cnn'
      };
    } else {
      console.log(`
Get a free Hugging Face API key:
1. Create account at https://huggingface.co/
2. Go to Settings > Access Tokens
3. Create token with 'Read' permissions

The system will use fallback analysis without an API key.
`);
      
      this.config.ai = {
        provider: 'huggingface',
        apiKey: '',
        model: 'facebook/bart-large-cnn'
      };
    }
  }

  async setupScheduling() {
    console.log('\n⏰ Schedule Configuration');
    
    const timezone = await this.question('Enter your timezone (e.g., America/New_York): ') || 'America/New_York';
    const workStart = await this.question('Enter work start time (e.g., 09:00): ') || '09:00';
    const workEnd = await this.question('Enter work end time (e.g., 17:00): ') || '17:00';
    
    console.log('\nSummary schedule options:');
    console.log('1. Twice daily (morning & evening)');
    console.log('2. Three times (morning, noon, evening)');
    console.log('3. Custom times');
    
    const scheduleChoice = await this.question('Choose schedule (1-3): ') || '1';
    
    let summaryTimes;
    switch (scheduleChoice) {
      case '1':
        summaryTimes = ['08:00', '17:00'];
        break;
      case '2':
        summaryTimes = ['08:00', '12:00', '17:00'];
        break;
      case '3':
        const customTimes = await this.question('Enter times (comma-separated, e.g., 08:00,12:00,17:00): ');
        summaryTimes = customTimes.split(',').map(t => t.trim());
        break;
      default:
        summaryTimes = ['08:00', '17:00'];
    }

    this.config.scheduling = {
      timeZone: timezone,
      workingHours: {
        start: workStart,
        end: workEnd
      },
      summaryTimes: summaryTimes
    };

    console.log(`\n📅 Scheduled for: ${summaryTimes.join(', ')} in ${timezone}`);
  }

  async setupPriorities() {
    console.log('\n📋 Priority Configuration');
    
    const customPriorities = await this.question('Do you want to customize priority rules? (y/n): ');
    
    if (customPriorities.toLowerCase() === 'y') {
      console.log(`
Edit the priorities.md file to customize:
- High/medium/low priority keywords
- Email sender priority rules
- Meeting booking rules
- Working hours and buffers

The default priorities.md has examples to get you started.
`);
      
      const customPath = await this.question('Enter path to custom priorities file (or press enter for default): ');
      this.config.prioritiesDocumentPath = customPath || './priorities.md';
    } else {
      this.config.prioritiesDocumentPath = './priorities.md';
    }
  }

  async saveConfiguration() {
    console.log('\n💾 Saving configuration...');
    
    // Save main config
    await fs.writeJson(path.join(process.cwd(), 'config.json'), this.config, { spaces: 2 });
    
    // Create .env file
    const envContent = `# EAssistant Configuration
# Generated by setup script

# Google API Configuration  
GOOGLE_CLIENT_ID=${this.config.google.clientId}
GOOGLE_CLIENT_SECRET=${this.config.google.clientSecret}
GOOGLE_REFRESH_TOKEN=${this.config.google.refreshToken}

# Email Configuration
EMAIL_USER=${this.config.email.user}
EMAIL_PASSWORD=${this.config.email.password}

# AI Service Configuration
HF_API_KEY=${this.config.ai.apiKey}

# Notification Settings
NOTIFICATION_EMAIL=${this.config.notification.recipientEmail}

# Timezone
TIMEZONE=${this.config.scheduling.timeZone}
`;

    await fs.writeFile(path.join(process.cwd(), '.env'), envContent);
    
    // Ensure logs directory exists
    await fs.ensureDir(path.join(process.cwd(), 'logs'));
    
    console.log('✅ Configuration saved!');
    console.log('📁 Files created: config.json, .env');
  }

  async testConfiguration() {
    console.log('\n🔧 Testing configuration...');
    
    const testNow = await this.question('Run connection test now? (y/n): ');
    
    if (testNow.toLowerCase() === 'y') {
      try {
        const EAssistant = require('./src/index');
        const assistant = new EAssistant();
        const result = await assistant.testConnection();
        
        if (result.success) {
          console.log('✅ All connections successful!');
        } else {
          console.log('⚠️ Some connections failed. Check the logs above.');
          console.log('You can run "npm start test" later to retest.');
        }
      } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.log('Run "npm start test" after setup to verify configuration.');
      }
    }
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new EAssistantSetup();
  setup.run().catch(console.error);
}

module.exports = EAssistantSetup;