# 🤖 Automated Email-Triggered Meeting Booking

## 🚀 Overview

Your EAssistant now supports **fully automated meeting booking** triggered by natural language emails! Simply send an email with your meeting request, and the AI agent will:

1. **Parse your email** for meeting details
2. **Trigger GitHub Actions workflow** automatically  
3. **Book the meeting** in your calendar
4. **Send confirmations** to all attendees
5. **Reply to you** with booking status

**No more manual GitHub Actions interface!** ✨

---

## 📧 How to Use - Send Meeting Request Emails

### Simple Email Format

Send an email to your configured address with meeting details:

**Subject:** `Meeting Request` (or any subject)

**Body Examples:**

```text
Book meeting tomorrow at 2pm with john@company.com for 1 hour
```

```text
Schedule meeting Monday at 10am with team@company.com and client@external.com
```

```text
Can we meet Friday at 3pm with manager@company.com for 30 minutes
```

```text
Arrange meeting April 26 at 14:00 with colleague@company.com
```

### What the AI Understands

The email parser recognizes:

- **📅 Dates:**
  - `tomorrow`, `Monday`, `Tuesday`, etc.
  - `April 26`, `4/26`, `2026-04-26`
  
- **🕐 Times:**
  - `2pm`, `14:00`, `10:30am`
  - `2pm-3pm` (duration from time range)
  
- **👥 Attendees:**
  - Any valid email addresses in the message
  - Multiple emails: `user1@email.com and user2@email.com`
  
- **⏰ Duration:**
  - `for 1 hour`, `30 minutes`, `90 mins`
  - Defaults to 60 minutes if not specified

### Meeting Keywords

Include these phrases to ensure detection:
- `book meeting`, `schedule meeting`, `arrange meeting`
- `set up meeting`, `meeting request`, `can we meet`
- `lets meet`, `book time`, `schedule time`

---

## 🔧 Setup Requirements

### GitHub Repository Secrets

Add this **new secret** to your GitHub repository:

1. **Go to:** `https://github.com/Sinsanvi/Eassistant/settings/secrets/actions`
2. **Click:** "New repository secret"
3. **Name:** `GITHUB_TOKEN`
4. **Value:** Your GitHub Personal Access Token

### How to Generate GitHub Token

1. **Visit:** GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Name:** "EAssistant Workflow Trigger"
4. **Expiration:** 90 days (recommended)
5. **Scopes:** Select these permissions:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
6. **Generate** and copy the token immediately
7. **Add to repository secrets** as `GITHUB_TOKEN`

**⚠️ Important:** Keep your token secure and never commit it to your repository!

---

## 🤖 How It Works

### Automated Process Flow

1. **Daily Summary Runs** (8 AM & 5 PM UTC)
2. **Scans Unread Emails** for meeting requests
3. **AI Parsing** extracts meeting details with confidence scoring
4. **GitHub API Triggers** the meeting booking workflow
5. **Calendar Integration** books the meeting with conflict detection
6. **Email Responses** sent to all parties
7. **Summary Includes** meeting booking results

### Confidence Scoring

The AI assigns confidence scores to meeting requests:
- **90%+:** Tomorrow/specific dates with clear times
- **80%+:** Day-of-week references with times  
- **70%+:** Specific dates with attendees
- **60%+:** Minimum threshold for processing

Only requests with 60%+ confidence are automatically processed.

### Error Handling

If booking fails, you'll receive an email with:
- **Clear error explanation**
- **Troubleshooting steps**
- **Format examples for future requests**
- **Manual GitHub Actions link**

---

## 📊 Integration with Daily Summary

Your daily summary emails now include:

### 🤖 Automated Meeting Requests Section
- **Total requests processed**
- **Success/failure counts** 
- **Individual request status**
- **Confidence scores**
- **Error details** for failed requests

### Enhanced System Information
- Meeting requests processed: X
- Successful bookings: X
- Processing time included

---

## 🎯 Examples & Use Cases

### Quick Tomorrow Meetings
```text
Subject: Quick sync
Body: Book meeting tomorrow at 10am with sarah@company.com for 15 minutes
```

### Weekly Team Meetings  
```text
Subject: Team Planning
Body: Schedule meeting Monday at 9am with team@company.com for 2 hours
```

### Client Meetings
```text
Subject: Client Presentation
Body: Arrange meeting April 30 at 2pm with client@external.com and sales@company.com for 90 minutes
```

### One-on-Ones
```text
Subject: 1:1 Check-in
Body: Can we meet Friday at 11am with direct.report@company.com for 30 minutes
```

---

## 🔍 Troubleshooting

### Common Issues

**❌ "Meeting request not detected"**
- **Solution:** Include meeting keywords like "book meeting" or "schedule meeting"
- **Example:** "Book meeting tomorrow at 2pm" instead of "See you tomorrow at 2pm"

**❌ "Date/time parsing failed"**
- **Solution:** Use clear, specific time references
- **Good:** "tomorrow at 2pm", "Monday at 10am"
- **Avoid:** "sometime next week", "later today"

**❌ "No attendees found"**
- **Solution:** Include valid email addresses in your message
- **Example:** "with john@company.com" not "with John"

**❌ GitHub workflow trigger failed**
- **Solution:** Verify `GITHUB_TOKEN` secret is set correctly
- **Check:** Token has `repo` and `workflow` permissions

### Response Email Not Received

If you don't get a response email:
1. **Check spam folder** for automated responses
2. **Verify** your email is in the attendees list
3. **Check** daily summary for processing results
4. **Manual fallback:** Use GitHub Actions interface

---

## 📈 Monitoring & Analytics

### Daily Summary Integration

Every daily summary includes:
- **Meeting requests found:** Number of emails parsed
- **Processing results:** Success/failure breakdown
- **Response emails sent:** Confirmation delivery status
- **System performance:** Processing times and efficiency

### GitHub Actions Logs

Monitor automated bookings:
1. **Visit:** `https://github.com/Sinsanvi/Eassistant/actions`
2. **Select:** "Book Meeting" workflow runs
3. **Review:** Automated trigger logs and results

---

## 🚀 Production Deployment

### Step 1: Generate & Configure GitHub Token
```bash
# Generate token at: https://github.com/settings/tokens
# Add to repository secrets as GITHUB_TOKEN
```

### Step 2: Commit Automated Features
```bash
git add .
git commit -m "Add automated email-triggered meeting booking"
git push origin main
```

### Step 3: Test the System
1. **Send test email** to your configured address
2. **Wait for daily summary** or manually trigger workflow
3. **Check calendar** for new meeting
4. **Verify response email** received

### Step 4: Production Use
- **Share email address** with team for meeting requests
- **Monitor daily summaries** for booking results
- **Set up recurring availability** if desired

---

## 🔄 Workflow Integration

### Existing Workflows Enhanced
- ✅ **Daily Summary:** Now includes meeting request processing
- ✅ **Book Meeting:** Can be triggered via API automatically
- ✅ **Find Slots:** Integrated with conflict detection

### New Automated Capabilities
- 🤖 **Email parsing** with natural language processing
- 🔄 **Workflow triggering** via GitHub API
- 📧 **Smart email responses** with troubleshooting
- 📊 **Analytics integration** in daily summaries

---

## 💡 Tips for Best Results

### Email Writing Tips
1. **Be specific:** "Tomorrow at 2pm" not "tomorrow afternoon"
2. **Include duration:** "for 30 minutes" or "for 1 hour"  
3. **Use clear attendee emails:** Always include full email addresses
4. **Add context:** Subject line helps with meeting titles

### Meeting Patterns
- **Daily standups:** "Book standup tomorrow at 9am with team@company.com for 15 minutes"
- **Client calls:** "Schedule client call Friday at 2pm with client@external.com for 1 hour"
- **1:1s:** "Book 1:1 Monday at 11am with manager@company.com for 30 minutes"

### Error Prevention
- **Check time zones:** System uses configured timezone
- **Verify working hours:** Meetings outside 9-5 get warnings
- **Avoid conflicts:** System checks calendar automatically
- **Buffer time:** 15-minute buffers added between meetings

---

## 🎉 What's Next

Your EAssistant now handles meeting booking completely automatically! The system will:

✅ **Process email requests** during daily summaries  
✅ **Book meetings automatically** with conflict detection  
✅ **Send confirmations** to all attendees  
✅ **Report results** in your daily summary  
✅ **Handle errors gracefully** with helpful responses

**Just send an email, and your AI assistant handles the rest!** 🚀

---

## 📞 Support & Feedback

If you encounter issues:
1. **Check daily summary** for processing results
2. **Review GitHub Actions logs** for detailed information  
3. **Verify repository secrets** are configured correctly
4. **Use manual GitHub Actions** as fallback option

The automated meeting booking feature is designed to be robust and user-friendly, making scheduling effortless through simple email requests!