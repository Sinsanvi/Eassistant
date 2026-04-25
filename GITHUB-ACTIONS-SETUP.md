# ☁️ GitHub Actions Setup Guide
*Run your EAssistant automatically in the cloud*

## 🎯 What This Does
- Runs your AI assistant **automatically in the cloud**
- No need to keep your Mac running 24/7
- Sends summaries twice daily (8 AM & 5 PM UTC)
- Completely free with GitHub's free tier
- Works from anywhere in the world

---

## ✅ Prerequisites
- GitHub account
- EAssistant repository (already done ✓)
- Working local setup (test with `npm start test` first)

---

## 🔑 Step 1: Collect Your Credentials

Before starting, gather these from your working local setup:

From your `.env` file:
```bash
cat .env
```

You'll need:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET` 
- `GOOGLE_REFRESH_TOKEN`
- `EMAIL_USER`
- `EMAIL_PASSWORD`
- `NOTIFICATION_EMAIL`

---

## 🏗️ Step 2: Set Up Repository Secrets

### 2.1 Go to Repository Settings
1. Go to your GitHub repository: `https://github.com/Sinsanvi/Eassistant`
2. Click the **"Settings"** tab (top right)
3. In left sidebar, click **"Secrets and variables"** → **"Actions"**

### 2.2 Add Required Secrets
Click **"New repository secret"** for each of these:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `GOOGLE_CLIENT_ID` | Your Google Client ID | `399763512798-abc...googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Your Google Client Secret | `GOCSPX-abc123...` |
| `GOOGLE_REFRESH_TOKEN` | Your Google Refresh Token | `1//06abc123...` |
| `EMAIL_USER` | Your Gmail address | `your_email@gmail.com` |
| `EMAIL_PASSWORD` | Your Gmail app password | `abcdefghijklmnop` |
| `NOTIFICATION_EMAIL` | Where summaries go | `notifications@example.com` |

### 2.3 Add Optional Variables (if needed)
Click **"Variables"** tab, then **"New repository variable"**:

| Variable Name | Value | Default |
|---------------|-------|---------|
| `TIMEZONE` | Your timezone | `America/New_York` |

---

## ⚙️ Step 3: Configure the Workflow

The workflow file already exists at `.github/workflows/eassistant.yml`. 

### 3.1 Customize Schedule (Optional)
Edit the schedule times in the workflow file:

```yaml
on:
  schedule:
    # 8:00 AM UTC = Adjust for your timezone
    - cron: '0 8 * * *'    
    # 5:00 PM UTC = Adjust for your timezone  
    - cron: '0 17 * * *'
```

**Timezone Conversion Examples:**
- **EST (UTC-5)**: 8 AM EST = `'0 13 * * *'` UTC
- **PST (UTC-8)**: 8 AM PST = `'0 16 * * *'` UTC  
- **GMT (UTC+0)**: 8 AM GMT = `'0 8 * * *'` UTC

### 3.2 Current Schedule
The workflow runs at:
- **8:00 AM UTC** (morning summary)
- **5:00 PM UTC** (evening summary)

---

## 🧪 Step 4: Test the Setup

### 4.1 Manual Test Run
1. Go to your repository on GitHub
2. Click **"Actions"** tab
3. Click **"EAssistant Daily Summary"** workflow
4. Click **"Run workflow"** button
5. Leave defaults, click **"Run workflow"**

### 4.2 Check the Results
1. Wait 2-3 minutes for completion
2. Click on the workflow run
3. Check for:
   - ✅ All steps completed successfully
   - 📧 Summary email received
   - 📋 Job summary shows statistics

### 4.3 View Logs
Click on "generate-summary" job to see detailed logs:
```
✅ Gmail connection successful
✅ Calendar connection successful  
✅ Email sender connection successful
✅ Summary generation completed
```

---

## 📅 Step 5: Enable Automatic Scheduling

### 5.1 Verify Workflow is Active
- Go to **Actions** → **EAssistant Daily Summary**
- Should show "Active" status
- If disabled, click "Enable workflow"

### 5.2 Next Scheduled Runs
The workflow will automatically run:
- **Every day at 8:00 AM UTC**
- **Every day at 5:00 PM UTC**

### 5.3 Monitor Executions
- Check **Actions** tab to see run history
- Each run shows success/failure status
- Download logs for troubleshooting

---

## 🎛️ Advanced Configuration

### Workflow Options
When running manually, you can choose:

| Option | Description | Values |
|--------|-------------|--------|
| `summary_type` | Type of summary | `full`, `emails-only`, `calendar-only` |
| `send_email` | Send email notification | `true`, `false` |

### Custom Schedule Examples

**Three times daily**:
```yaml
schedule:
  - cron: '0 8 * * *'   # 8 AM UTC
  - cron: '0 12 * * *'  # 12 PM UTC  
  - cron: '0 17 * * *'  # 5 PM UTC
```

**Weekdays only**:
```yaml
schedule:
  - cron: '0 8 * * 1-5'  # Monday-Friday 8 AM
  - cron: '0 17 * * 1-5' # Monday-Friday 5 PM
```

**Different timezones**:
```yaml
# For PST (UTC-8), 8 AM PST = 4 PM UTC
- cron: '0 16 * * *'
```

---

## 📊 Step 6: Monitor and Maintain

### 6.1 Check Execution Status
1. Go to **Actions** tab regularly
2. Look for ❌ failed runs
3. Click failed runs to see error details

### 6.2 Update Secrets When Needed
- **Refresh tokens expire**: Update `GOOGLE_REFRESH_TOKEN`
- **App passwords change**: Update `EMAIL_PASSWORD`
- **Email addresses change**: Update notification settings

### 6.3 View Execution History
- **Actions** tab shows all runs
- **Artifacts** contain detailed logs
- **Job summaries** show key metrics

---

## 🚨 Troubleshooting

### Common Issues

**❌ Workflow not running**
```
Solution: Check if workflow is enabled in Actions tab
```

**❌ Authentication failed** 
```
Solution: Verify all secrets are set correctly
```

**❌ No email received**
```
Solution: Check spam folder, verify NOTIFICATION_EMAIL secret
```

**❌ Secrets not working**
```
Solution: Re-add secrets (copy-paste carefully)
```

### Debug Steps

1. **Manual workflow run** to test immediately
2. **Check Actions logs** for detailed error messages  
3. **Verify all secrets** are present and correct
4. **Test locally first** before debugging GitHub Actions

### Getting Logs
```bash
# Download logs from Actions tab
# Or check the job summary for quick stats
```

---

## 💰 Cost & Limitations

### GitHub Free Tier
- ✅ **2,000 minutes/month** free
- ✅ Your usage: ~10 minutes/month  
- ✅ **Completely free** for this use case

### Limitations
- Runs on **Ubuntu** (not Mac), but code is compatible
- **Public repositories** only (unless GitHub Pro)
- Workflow logs retained for **90 days**

---

## 🔒 Security Best Practices

### Secrets Management
- ✅ Use repository secrets (never commit credentials)
- ✅ Rotate refresh tokens periodically
- ✅ Use minimal scopes for Google APIs
- ✅ Monitor workflow execution logs

### Access Control
- ✅ Limit repository access
- ✅ Review workflow changes carefully
- ✅ Use branch protection if needed

---

## 🎯 Quick Reference

### Essential Commands
```bash
# Test locally first
npm start test

# Check workflow status  
# Go to Actions tab on GitHub

# Manual run
# Actions → EAssistant Daily Summary → Run workflow
```

### Key URLs
- **Repository Settings**: `https://github.com/Sinsanvi/Eassistant/settings`
- **Actions**: `https://github.com/Sinsanvi/Eassistant/actions`  
- **Secrets**: `https://github.com/Sinsanvi/Eassistant/settings/secrets/actions`

### Timezone Converter
Use https://worldtimebuddy.com/ to convert your local time to UTC for cron schedules.

---

## ✅ Setup Checklist

- [ ] Repository secrets added (6 required secrets)
- [ ] Workflow file exists (`.github/workflows/eassistant.yml`)
- [ ] Schedule times configured for your timezone  
- [ ] Manual test run completed successfully
- [ ] Email summary received
- [ ] Workflow enabled for automatic runs
- [ ] Monitoring plan in place

---

🎉 **Your EAssistant now runs automatically in the cloud!**

No more keeping your Mac running 24/7. GitHub will handle everything and send you summaries twice daily, wherever you are in the world! 🚀