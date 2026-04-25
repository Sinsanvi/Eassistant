# 📅 Meeting Booking Feature Guide

## 🚀 Overview

The EAssistant now includes powerful meeting booking capabilities that work both locally and in GitHub Actions. You can:

- **Book meetings** with automatic conflict detection
- **Find available time slots** for scheduling
- **Send calendar invitations** to attendees
- **Run everything in the cloud** via GitHub Actions

---

## 💻 Local Usage

### 1. Book a Specific Meeting
```bash
npm start book "Team Sync" "2026-04-26" "10:00" "user@example.com,colleague@company.com" 60
```

**Parameters:**
- `"Team Sync"` - Meeting title
- `"2026-04-26"` - Date (YYYY-MM-DD format)
- `"10:00"` - Time (24-hour format)
- `"user@example.com,colleague@company.com"` - Attendee emails (comma-separated)
- `60` - Duration in minutes (optional, default: 60)

### 2. Book Tomorrow's Meeting (Quick)
```bash
npm start book-tomorrow "14:00" "manager@company.com" "Project Review"
```

**Parameters:**
- `"14:00"` - Time for tomorrow
- `"manager@company.com"` - Attendee email
- `"Project Review"` - Meeting title

### 3. Find Available Slots
```bash
npm start find-slots 60 7
```

**Parameters:**
- `60` - Meeting duration in minutes
- `7` - Days to search ahead

### 4. Advanced Slot Finding
```bash
npm start find-slots 30 14
```
Find 30-minute slots over the next 2 weeks.

---

## ☁️ GitHub Actions Usage

### 🔧 Setup Required

Your GitHub repository already has the workflows, but you need the same secrets as the daily summary:

**Required Secrets** (already set if daily summary works):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REFRESH_TOKEN`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `NOTIFICATION_EMAIL`

**Optional Variables:**
- `TIMEZONE` (default: America/New_York)

### 📅 Book Meeting via GitHub Actions

1. **Go to your repository**: `https://github.com/Sinsanvi/Eassistant/actions`
2. **Select workflow**: "Book Meeting"
3. **Click "Run workflow"**
4. **Fill in the form**:
   - **Meeting Title**: e.g., "Team Planning Session"
   - **Meeting Date**: e.g., "2026-04-27" (YYYY-MM-DD)
   - **Meeting Time**: e.g., "10:00" (HH:MM, 24-hour)
   - **Attendees**: e.g., "user1@company.com,user2@company.com"
   - **Duration**: e.g., "90" (minutes)
   - **Send Confirmation**: ✅ (recommended)
5. **Click "Run workflow"**

### 🔍 Find Slots via GitHub Actions

1. **Go to Actions**: "Find Meeting Slots"
2. **Click "Run workflow"**
3. **Configure search**:
   - **Duration**: e.g., "60" (minutes)
   - **Days**: e.g., "7" (days ahead)
   - **Timezone**: e.g., "America/Los_Angeles"
4. **Click "Run workflow"**

### 📊 Automatic Weekly Availability

The "Find Meeting Slots" workflow runs **every Monday at 9 AM UTC** to show your weekly availability.

---

## 🎯 Features & Capabilities

### ✅ Smart Conflict Detection
- **Checks existing calendar** for overlaps
- **Suggests alternatives** if time slot is busy
- **Respects working hours** (9 AM - 5 PM by default)
- **Adds 15-minute buffers** between meetings
- **Protects lunch time** (12 PM - 1 PM)

### 📧 Automatic Invitations
- **Sends calendar invites** to all attendees
- **Email confirmations** with meeting details
- **Reminder notifications** before the meeting
- **Professional HTML formatting**

### 🕐 Intelligent Scheduling
- **Works with your timezone** (configurable)
- **Finds optimal time slots** based on availability
- **Avoids back-to-back meetings** when possible
- **Considers attendee preferences** (future enhancement)

### 🔄 Alternative Suggestions
When your requested time isn't available:
- **Shows 5 alternative slots** automatically
- **Same duration** as requested
- **Next available times** within working hours
- **Different days** if same-day slots full

---

## 🛠️ Advanced Configuration

### Timezone Settings
Update in your `config.json` or environment:
```json
{
  "scheduling": {
    "timeZone": "America/Los_Angeles",
    "workingHours": {
      "start": "08:00",
      "end": "18:00"
    }
  }
}
```

### Working Hours Customization
Modify the working hours in your configuration:
- **start**: "08:00" (8 AM)
- **end**: "18:00" (6 PM)

### Buffer Time Settings
Edit `src/meetingService.js` to change buffer requirements:
```javascript
// Default: 15 minutes between meetings
await this.checkBufferTime(startTime, endTime, 15);
```

---

## 📋 Meeting Templates

### Daily Standups
```bash
npm start book "Daily Standup" "2026-04-26" "09:00" "team@company.com" 15
```

### Weekly Reviews
```bash
npm start book "Weekly Review" "2026-04-29" "14:00" "manager@company.com" 60
```

### Client Meetings
```bash
npm start book "Client Presentation" "2026-04-30" "10:00" "client@external.com,sales@company.com" 90
```

### One-on-Ones
```bash
npm start book-tomorrow "11:00" "direct.report@company.com" "1:1 Check-in"
```

---

## 🔍 Troubleshooting

### Common Issues

**❌ "Time slot not available"**
- **Solution**: Run `npm start find-slots 60 7` to see available times
- **Alternative**: Use suggested time slots from the error message

**❌ "Invalid email format"**
- **Solution**: Check attendee emails are properly formatted
- **Format**: Use commas without spaces: `user1@email.com,user2@email.com`

**❌ "Date in the past"**
- **Solution**: Use future dates only
- **Format**: YYYY-MM-DD (e.g., 2026-04-26)

**❌ GitHub Actions fails**
- **Solution**: Verify all secrets are set correctly
- **Check**: Go to repository Settings → Secrets and variables → Actions

### Validation Rules

The system automatically validates:
- ✅ **Date format**: Must be YYYY-MM-DD
- ✅ **Time format**: Must be HH:MM (24-hour)
- ✅ **Future dates**: Cannot book in the past
- ✅ **Working hours**: Warns if outside 9 AM - 5 PM
- ✅ **Email format**: Basic email validation
- ✅ **Duration limits**: Reasonable meeting lengths

---

## 🚀 Production Deployment

### Step 1: Commit & Push
```bash
git add .
git commit -m "Add meeting booking feature"
git push origin main
```

### Step 2: Verify Workflows
Check that these workflows appear in Actions:
- ✅ **Book Meeting** - Manual meeting scheduling
- ✅ **Find Meeting Slots** - Availability checking
- ✅ **EAssistant Daily Summary** - Existing daily summaries

### Step 3: Test the System
1. **Run "Find Meeting Slots"** to verify calendar access
2. **Book a test meeting** with yourself
3. **Check your calendar** for the new meeting
4. **Verify email confirmation** was sent

### Step 4: Production Use
- **Share workflows** with your team
- **Document meeting booking process** for colleagues
- **Set up recurring availability checks** if desired

---

## 📊 Usage Examples

### Weekly Team Planning
**Every Monday, automatically:**
1. **Find slots workflow runs** at 9 AM UTC
2. **Shows weekly availability** in job summary
3. **Team lead books meetings** using available slots

### Client Meeting Coordination
**For external meetings:**
1. **Find mutual availability** with `find-slots`
2. **Book meeting** with client emails
3. **Automatic invitations** sent to all parties
4. **Confirmation emails** with meeting details

### Manager 1:1s
**Regular check-ins:**
1. **Use `book-tomorrow`** for quick scheduling
2. **Set recurring patterns** in GitHub Actions (optional)
3. **Automatic calendar blocks** and reminders

---

## 🎯 Next Steps

### Immediate Actions
1. ✅ **Test the feature locally** with a sample meeting
2. ✅ **Try GitHub Actions booking** with yourself as attendee
3. ✅ **Share with team** members who need meeting scheduling

### Future Enhancements
- **Recurring meeting support** (weekly/monthly patterns)
- **Meeting room booking** integration
- **Attendee availability checking** across multiple calendars
- **Meeting agenda templates**
- **Post-meeting follow-up automation**

---

🎉 **Your EAssistant can now handle all your meeting scheduling needs, both locally and in the cloud!**

The system is production-ready and can scale to handle multiple meetings, complex scheduling scenarios, and team coordination workflows.