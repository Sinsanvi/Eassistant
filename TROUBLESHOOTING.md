# 🔧 EAssistant Troubleshooting Guide

## 🚨 Common Issues & Solutions

### 1. Gmail Connection Failed
```
❌ Gmail connection failed: invalid_grant
```
**Causes & Solutions:**
- **Wrong refresh token**: Get new token from [OAuth Playground](https://developers.google.com/oauthplayground/)
- **Expired token**: Generate fresh refresh token
- **Wrong scopes**: Ensure you selected `gmail.readonly` and `calendar` scopes

### 2. Email Sending Failed
```
❌ Email sender failed: Invalid login
```
**Solutions:**
- **Use App Password**: Never use your regular Gmail password
- **Enable 2FA**: Required for app passwords
- **Check App Password**: 16 characters, no spaces (e.g., `abcdefghijklmnop`)
- **Regenerate**: Create new app password if old one doesn't work

### 3. Node.js Issues
```
npm: command not found
```
**Solution:**
1. Install Node.js from https://nodejs.org/
2. Choose LTS version
3. Restart Terminal after installation

### 4. Permission Errors
```
Error: EACCES: permission denied
```
**Solutions:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm

# Or use sudo (not recommended)
sudo npm install
```

### 5. Calendar API Issues
```
❌ Calendar connection failed
```
**Solutions:**
- **Enable Calendar API**: In Google Cloud Console
- **Check OAuth Scopes**: Include `https://www.googleapis.com/auth/calendar`
- **Verify Credentials**: Client ID and Secret match your project

### 6. No Summary Email Received
**Check These:**
1. **Spam Folder**: Summary might be filtered
2. **Email Address**: Verify notification email in config
3. **App Password**: Must be Gmail app password, not regular password
4. **Network**: Ensure internet connection is stable

### 7. AI Service Errors
```
Hugging Face API error: Request failed with status code 404
```
**Not a Problem!** The system uses fallback analysis when AI API fails. This is normal and doesn't break functionality.

### 8. Timezone Issues
```
Error: moment(...).tz is not a function
```
**Solution:**
```bash
npm install moment-timezone
```
This should be automatically installed, but run if you see this error.

## 🛠️ Advanced Debugging

### Check All Connections
```bash
npm start test
```

### View Detailed Logs
```bash
# Enable debug mode
export NODE_ENV=development
npm start summary
```

### Reset Configuration
```bash
# Delete config and start fresh
rm .env config.json
npm run setup
```

### Check Service Status
```bash
# View available meeting slots (tests calendar)
npm start slots 30 3

# Generate immediate summary (tests everything)
npm start summary
```

## 📋 Diagnostic Checklist

When something isn't working, check:

- [ ] Node.js installed (v14+)
- [ ] Gmail API enabled in Google Cloud
- [ ] Calendar API enabled in Google Cloud  
- [ ] OAuth credentials created
- [ ] Refresh token generated with correct scopes
- [ ] 2FA enabled on Gmail
- [ ] App password generated (not regular password)
- [ ] `.env` file exists with correct values
- [ ] Internet connection stable

## 🔍 Configuration Verification

### Check Your .env File
```bash
cat .env
```
Should show (with your actual values):
```
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret  
GOOGLE_REFRESH_TOKEN=1//your_long_refresh_token
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_16_char_app_password
NOTIFICATION_EMAIL=where_summaries_go@example.com
```

### Test Individual Components
```bash
# Test only Gmail connection
node -e "
const Gmail = require('./src/gmailService'); 
const gmail = new Gmail(); 
gmail.getUserProfile().then(console.log).catch(console.error);
"

# Test only Calendar connection  
node -e "
const Calendar = require('./src/googleCalendar');
const cal = new Calendar();
cal.getTodaysEvents().then(console.log).catch(console.error);
"
```

## 🆘 Still Need Help?

### Error Messages to Share
When asking for help, include:
1. **Exact error message** (copy/paste from Terminal)
2. **Command you ran** 
3. **Your setup** (Mac version, Node.js version)
4. **What step failed** (installation, configuration, first run, etc.)

### Get System Info
```bash
# Check versions
node --version
npm --version
sw_vers  # Mac version
```

### Reset Everything
If all else fails:
```bash
# Complete reset
rm -rf node_modules package-lock.json .env config.json
npm install
npm run setup
```

## 💡 Prevention Tips

1. **Keep credentials secure** - never share refresh tokens
2. **Use app passwords** - never use regular Gmail password
3. **Enable 2FA** - required for Gmail app passwords
4. **Check Google Cloud billing** - ensure APIs stay enabled
5. **Keep Node.js updated** - use LTS versions
6. **Backup your .env** - save credentials safely offline

---

**Remember**: The most common issues are with Google API setup and Gmail app passwords. Take your time with these steps! 🎯