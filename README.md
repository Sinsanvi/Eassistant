# 🤖 EAssistant

An intelligent AI agent that reads through your Google Calendar and Gmail to summarize priorities and events twice daily, with automated meeting booking capabilities.

## 🚀 Features

- **📧 Gmail Integration**: Analyzes emails and identifies priority levels
- **📅 Google Calendar Integration**: Monitors events and detects scheduling conflicts  
- **🤖 AI-Powered Summarization**: Uses free Hugging Face API for intelligent analysis
- **📊 Priority Management**: Config-driven priority parsing from custom documents
- **⚡ Smart Meeting Booking**: Automatically books meetings while avoiding conflicts
- **📬 Email Notifications**: Sends beautifully formatted HTML summary emails
- **⏰ Flexible Scheduling**: Runs locally or via GitHub Actions
- **🔧 Config-Driven**: All API keys and preferences stored in config files

## 📋 Quick Start

### 1. Installation

```bash
git clone <your-repo-url>
cd Eassistant
npm install
```

### 2. Configuration

Copy the environment template:
```bash
cp .env.example .env
```

Fill in your API credentials:
```bash
# Google API Configuration  
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

# Email Configuration
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# AI Service (Free Hugging Face)
HF_API_KEY=your_huggingface_api_key

# Notifications
NOTIFICATION_EMAIL=your_notification_email@gmail.com
```

### 3. Google API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API and Calendar API
4. Create OAuth 2.0 credentials
5. Generate a refresh token using OAuth 2.0 Playground

### 4. Test Connection

```bash
npm start test
```

### 5. Run Summary

```bash
# Generate summary immediately
npm start summary

# Start scheduler for automatic twice-daily summaries
npm run schedule start
```

## 📖 Detailed Setup Guide

### Google API Configuration

#### Step 1: Create Google Cloud Project
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "EAssistant" 
3. Enable the following APIs:
   - Gmail API
   - Google Calendar API

#### Step 2: Create OAuth Credentials
1. Go to "Credentials" section
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure consent screen if prompted
4. Choose "Web application"
5. Add authorized redirect URI: `http://localhost:3000/oauth2callback`
6. Save the Client ID and Client Secret

#### Step 3: Generate Refresh Token
1. Go to [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click settings gear, check "Use your own OAuth credentials"
3. Enter your Client ID and Client Secret
4. In left panel, select:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar`
5. Click "Authorize APIs"
6. Complete the authorization flow
7. Click "Exchange authorization code for tokens"
8. Copy the refresh token

### Email Configuration

#### Gmail App Password
1. Enable 2-factor authentication on your Google account
2. Go to Google Account settings > Security
3. Under "2-Step Verification", click "App passwords"
4. Generate an app password for "Mail"
5. Use this password in the EMAIL_PASSWORD field

### AI Service Setup (Free)

#### Hugging Face API
1. Create account at [Hugging Face](https://huggingface.co/)
2. Go to Settings > Access Tokens
3. Create a new token with "Read" permissions
4. Copy the token to HF_API_KEY

The system uses free models, so no paid subscription required.

## 📁 Configuration Files

### config.json
Main configuration file. Environment variables override these values:

```json
{
  "google": {
    "clientId": "",
    "clientSecret": "",  
    "redirectUri": "http://localhost:3000/oauth2callback",
    "refreshToken": ""
  },
  "email": {
    "service": "gmail",
    "user": "",
    "password": ""
  },
  "ai": {
    "provider": "huggingface",
    "apiKey": "",
    "model": "facebook/bart-large-cnn"
  },
  "scheduling": {
    "timeZone": "America/New_York",
    "workingHours": {
      "start": "09:00",
      "end": "17:00"
    },
    "summaryTimes": ["08:00", "17:00"]
  },
  "notification": {
    "recipientEmail": ""
  }
}
```

### priorities.md
Define custom priority rules for emails and calendar events. Edit this file to match your workflow:

```markdown
# Priority Guidelines

## High Priority Keywords
- urgent, asap, deadline, meeting, interview, client

## Email Priority Rules  
1. Emails from your manager are automatically high priority
2. Emails with "deadline" in subject are high priority
3. Meeting invitations for today/tomorrow are high priority

## Meeting Booking Rules
- Only book during working hours (9 AM - 5 PM)
- Leave 15 minutes buffer between meetings
- Protect lunch break (12 PM - 1 PM)
```

## 💻 Usage

### Local Execution

```bash
# Run immediate summary
npm start summary

# Test all connections  
npm start test

# Find available meeting slots
npm start slots 60 5    # 60-min slots, next 5 days

# Start automatic scheduler
npm run schedule start

# Run summary manually
npm run schedule run

# Schedule one-time summary
npm run schedule schedule "2024-01-15 14:30" "Pre-meeting summary"
```

### GitHub Actions (Cloud Execution)

#### Setup Repository Secrets
Go to your GitHub repository Settings > Secrets and variables > Actions:

**Required Secrets:**
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REFRESH_TOKEN`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `HF_API_KEY`
- `NOTIFICATION_EMAIL`

**Optional Variables:**
- `TIMEZONE` (default: America/New_York)

#### Automatic Execution
The workflow runs automatically twice daily (8 AM & 5 PM UTC). Adjust times in `.github/workflows/eassistant.yml`.

#### Manual Trigger
1. Go to Actions tab in your GitHub repository
2. Select "EAssistant Daily Summary" workflow
3. Click "Run workflow"
4. Choose summary type and options

## 📚 API Reference

### Core Methods

```javascript
const EAssistant = require('./src/index');
const assistant = new EAssistant();

// Generate and send summary
const result = await assistant.generateSummary();

// Find available meeting slots  
const slots = await assistant.findMeetingSlots(60, 7); // 60 min, 7 days

// Book a meeting
const meeting = await assistant.bookMeeting({
  title: "Project Review",
  startTime: "2024-01-15T14:00:00Z", 
  endTime: "2024-01-15T15:00:00Z",
  description: "Monthly project review",
  attendees: [{ email: "colleague@company.com" }]
});

// Test all connections
const status = await assistant.testConnection();
```

### Priority Analysis

The system automatically analyzes:
- **Email Priority**: Based on subject, sender, keywords, and custom rules
- **Calendar Priority**: Meeting type, attendees, and time sensitivity
- **Schedule Conflicts**: Back-to-back meetings, long meeting blocks
- **Meeting Opportunities**: Available time slots for scheduling

## 🔧 Customization

### Custom Priority Rules
Edit `priorities.md` to match your workflow:

```markdown
## High Priority Keywords
- Add your organization-specific urgent terms
- Client names, project codenames, etc.

## Meeting Booking Rules  
- Adjust working hours for your timezone
- Set custom buffer times
- Define meeting length limits
```

### AI Model Configuration
Change the AI model in `config.json`:

```json
{
  "ai": {
    "provider": "huggingface",
    "model": "facebook/bart-large-cnn",    // Summarization
    "model": "microsoft/DialoGPT-medium"   // Alternative
  }
}
```

### Schedule Timing
Modify summary times in `config.json`:

```json
{
  "scheduling": {
    "summaryTimes": ["07:00", "12:00", "18:00"],  // 3 times daily
    "timeZone": "Europe/London"                   // Your timezone
  }
}
```

## 📊 Monitoring & Logs

### Local Logs
Logs are stored in `logs/` directory:
- `eassistant-YYYY-MM.log`: Monthly summary logs
- Each run includes timestamp, success status, and metrics

### GitHub Actions Logs
- View execution logs in Actions tab
- Download artifacts containing detailed logs  
- Job summaries show key metrics

### Health Checks
```bash
# Test all service connections
npm start test

# Verify Gmail access
npm start slots 30 1

# Check calendar integration  
npm start summary  
```

## 🚨 Troubleshooting

### Common Issues

#### "Gmail connection failed"
- Check your app password is correct
- Verify 2FA is enabled on Google account
- Ensure Gmail API is enabled in Google Cloud Console

#### "Calendar connection failed"  
- Verify Calendar API is enabled
- Check OAuth scopes include calendar access
- Regenerate refresh token if needed

#### "Email sending failed"
- Confirm EMAIL_USER and EMAIL_PASSWORD are correct
- Check that "Less secure app access" is disabled (use app password)
- Verify NOTIFICATION_EMAIL is a valid address

#### "AI summarization failed"
- System will fall back to rule-based analysis
- Check HF_API_KEY is valid
- Ensure model name is correct in config

#### GitHub Actions failing
- Verify all secrets are set correctly
- Check workflow logs for specific errors
- Ensure repository secrets match local .env values

### Debug Mode
Enable detailed logging by setting:
```bash
export NODE_ENV=development
npm start summary
```

## 🔒 Security & Privacy

### Data Handling
- **Local Only**: No data stored in cloud (except GitHub Actions)
- **OAuth Tokens**: Securely stored, automatically refreshed
- **Email Content**: Processed locally, not transmitted to external services
- **AI Processing**: Only summary data sent to Hugging Face

### Best Practices  
- Use app passwords, not account passwords
- Regularly rotate API keys  
- Review OAuth permissions periodically
- Keep dependencies updated

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`  
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Roadmap

### Upcoming Features
- [ ] Slack integration for notifications
- [ ] Microsoft Outlook/Teams support
- [ ] Advanced meeting scheduling with attendee availability
- [ ] Custom email templates
- [ ] Mobile app notifications
- [ ] Integration with task management tools (Todoist, Asana)
- [ ] Voice assistant integration  
- [ ] Advanced analytics dashboard

### Current Limitations
- Only supports Gmail and Google Calendar
- AI models limited to free tiers
- No real-time notifications (scheduled only)
- English language only for priority detection

## 📞 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/your-username/eassistant/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/your-username/eassistant/discussions)
- 📚 **Documentation**: See this README and inline code comments
- 💬 **Community**: [GitHub Discussions](https://github.com/your-username/eassistant/discussions)

---

**Made with ❤️ by [Your Name]**

*Automate your daily workflow and never miss important emails or meetings again!*