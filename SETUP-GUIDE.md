# 🤖 EAssistant Setup Guide for Mac
*Simple step-by-step instructions to get your AI email assistant working*

## 📋 What This Does
This AI assistant will:
- Read your Gmail emails twice daily (8 AM & 5 PM)
- Check your Google Calendar for meetings
- Send you a summary email with priorities
- Help schedule meetings automatically

---

## ✅ Prerequisites
Make sure you have:
- A **Gmail account** (the one you want to monitor)
- A **Mac computer**
- **Internet connection**

---

## 🚀 Step 1: Download the Code

1. **Open Terminal** (press `Cmd + Space`, type "Terminal", press Enter)
2. **Navigate to Desktop**:
   ```bash
   cd Desktop
   ```
3. **Download the code**:
   ```bash
   git clone https://github.com/Sinsanvi/Eassistant.git
   cd Eassistant
   ```

---

## 📦 Step 2: Install Required Software

1. **Install Node.js** (if not already installed):
   - Go to https://nodejs.org/
   - Download the "LTS" version
   - Run the installer and follow the prompts

2. **Install the project**:
   ```bash
   npm install
   ```

---

## 🔑 Step 3: Set Up Google API (Most Important Step!)

### 3.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Click "Create Project" 
3. Name it "EAssistant" → Click "Create"
4. Wait for project to be created

### 3.2 Enable APIs
1. In the left menu, click "APIs & Services" → "Library"
2. Search for "Gmail API" → Click it → Click "Enable"
3. Search for "Calendar API" → Click it → Click "Enable"

### 3.3 Create Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client IDs"
3. If prompted, configure consent screen:
   - Choose "External" → Click "Create"
   - Fill in App name: "EAssistant"
   - Add your email in "User support email" and "Developer contact"
   - Click "Save and Continue" through all steps
4. Back to Credentials:
   - Application type: "Web application"
   - Name: "EAssistant"
   - Authorized redirect URIs: Add `http://localhost:3000/oauth2callback`
   - Click "Create"
5. **SAVE** the Client ID and Client Secret (you'll need these!)

### 3.4 Get Refresh Token
1. Go to https://developers.google.com/oauthplayground/
2. Click the ⚙️ settings gear
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from step 3.3
5. In the left panel, add these scopes:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   https://www.googleapis.com/auth/calendar
   ```
6. Click "Authorize APIs" → Sign in with your Gmail account
7. Click "Exchange authorization code for tokens"
8. **SAVE** the refresh token (long string starting with `1//`)

---

## 📧 Step 4: Set Up Email Sending

### 4.1 Enable 2-Factor Authentication
1. Go to https://myaccount.google.com/security
2. Turn on "2-Step Verification" if not already enabled

### 4.2 Create App Password
1. Go to https://myaccount.google.com/security
2. Click "2-Step Verification" → "App passwords"
3. Select "Mail" → Generate
4. **SAVE** the 16-character password (like: `abcd efgh ijkl mnop`)

---

## ⚙️ Step 5: Configure the App

1. **Open Terminal** in the EAssistant folder:
   ```bash
   cd Desktop/Eassistant
   ```

2. **Run the setup**:
   ```bash
   npm run setup
   ```

3. **Follow the prompts** and enter:
   - Google Client ID (from Step 3.3)
   - Google Client Secret (from Step 3.3)
   - Google Refresh Token (from Step 3.4)
   - Your Gmail address
   - Gmail App Password (from Step 4.2)
   - Email where you want summaries sent
   - Your timezone (e.g., America/New_York)

---

## 🧪 Step 6: Test Everything

1. **Test connections**:
   ```bash
   npm start test
   ```
   You should see all ✅ green checkmarks

2. **Generate first summary**:
   ```bash
   npm start summary
   ```
   Check your email for the summary!

---

## 🕐 Step 7: Start Automatic Scheduling

**To run twice daily (8 AM & 5 PM)**:
```bash
npm run schedule start
```

**To stop the scheduler**:
Press `Ctrl + C` in Terminal

---

## 📱 Daily Usage

### Manual Summary (anytime)
```bash
cd Desktop/Eassistant
npm start summary
```

### Check Available Meeting Times
```bash
npm start slots 60 7
```
*(Shows 60-minute slots for next 7 days)*

### Start/Stop Automatic Scheduling
```bash
# Start
npm run schedule start

# Stop (press Ctrl + C)
```

---

## 🆘 Troubleshooting

### Problem: "Gmail connection failed"
**Solution**: Check your app password is correct (16 characters, no spaces)

### Problem: "Calendar connection failed"  
**Solution**: Make sure you enabled Calendar API in Google Cloud Console

### Problem: "Command not found"
**Solution**: Install Node.js from https://nodejs.org/

### Problem: "Permission denied"
**Solution**: Try running with `sudo` before the command

### Problem: No summary email received
**Solution**: 
1. Check spam folder
2. Verify notification email address is correct
3. Make sure Gmail app password is correct

---

## 🔒 Security Notes

- Your credentials are stored locally in `.env` file (not shared)
- Never share your Google Client Secret or Refresh Token
- The app only reads emails and calendar (doesn't modify anything)
- You can revoke access anytime in Google Account settings

---

## 📞 Quick Commands Reference

| Command | What it does |
|---------|-------------|
| `npm start test` | Test all connections |
| `npm start summary` | Generate summary now |
| `npm run schedule start` | Start auto summaries |
| `npm start slots 30 5` | Find 30-min slots, next 5 days |

---

## 💡 Tips

1. **First time setup takes 15-30 minutes** (mostly Google API setup)
2. **After setup, it runs automatically** 
3. **Check email summaries twice daily** at 8 AM & 5 PM
4. **Leave Terminal open** if you want automatic scheduling
5. **Your Mac needs to be on** for scheduling to work

---

**Need help?** 
- Check the main README.md for detailed information
- Google API setup is the trickiest part - take your time!
- The app will work with fallback analysis even if some parts fail

🎉 **Enjoy your AI assistant!**