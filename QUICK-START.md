# ⚡ EAssistant Quick Start
*For experienced users who want to get started fast*

## 🏃‍♂️ 3-Minute Setup

### 1. Clone & Install
```bash
git clone https://github.com/Sinsanvi/Eassistant.git
cd Eassistant
npm install
```

### 2. Google API Setup
1. [Google Cloud Console](https://console.cloud.google.com/) → New Project
2. Enable: Gmail API + Calendar API  
3. Create OAuth 2.0 credentials
4. Get refresh token from [OAuth Playground](https://developers.google.com/oauthplayground/)

### 3. Gmail App Password
1. Enable 2FA on Gmail
2. Generate app password at [Google Security](https://myaccount.google.com/security)

### 4. Configure
```bash
npm run setup
```
Enter your credentials when prompted.

### 5. Test & Run
```bash
npm start test        # Verify connections
npm start summary     # First summary  
npm run schedule start # Auto twice-daily
```

## 🎯 Key Commands
- `npm start summary` - Manual summary
- `npm start test` - Connection test
- `npm start slots 60 7` - Find meeting slots
- `npm run schedule start` - Auto scheduling

## 📧 What You Get
- HTML email summaries twice daily (8 AM & 5 PM)
- Priority email classification  
- Calendar conflict detection
- Available meeting time suggestions
- AI-powered insights

**That's it!** Your AI assistant is ready 🚀