# ☑️ GitHub Actions Setup Checklist
*Quick reference for setting up cloud automation*

## 🚀 Pre-Setup
- [ ] **Test locally first**: Run `npm start test` successfully
- [ ] **Have credentials ready**: From your working `.env` file

## 🔑 Step 1: Add Repository Secrets
Go to: `https://github.com/Sinsanvi/Eassistant/settings/secrets/actions`

**Required Secrets** (click "New repository secret" for each):
- [ ] `GOOGLE_CLIENT_ID` → Your Google Client ID
- [ ] `GOOGLE_CLIENT_SECRET` → Your Google Client Secret  
- [ ] `GOOGLE_REFRESH_TOKEN` → Your refresh token (starts with `1//`)
- [ ] `EMAIL_USER` → Your Gmail address
- [ ] `EMAIL_PASSWORD` → Your Gmail app password (16 characters)
- [ ] `NOTIFICATION_EMAIL` → Where you want summaries sent

**Optional Variables** (click "Variables" tab):
- [ ] `TIMEZONE` → Your timezone (e.g., `America/New_York`)

## 🧪 Step 2: Test the Setup
1. [ ] Go to **Actions** tab in your GitHub repository
2. [ ] Click **"EAssistant Daily Summary"**
3. [ ] Click **"Run workflow"** → **"Run workflow"**
4. [ ] Wait 2-3 minutes for completion
5. [ ] Check your email for the summary
6. [ ] Verify all steps show ✅ in the workflow

## ⚙️ Step 3: Configure Schedule (Optional)
Current schedule: **8 AM & 5 PM UTC**

**To change times**, edit `.github/workflows/eassistant.yml`:
```yaml
schedule:
  - cron: '0 13 * * *'  # 1 PM UTC = 8 AM EST  
  - cron: '0 22 * * *'  # 10 PM UTC = 5 PM EST
```

**Timezone Examples:**
- **EST (UTC-5)**: 8 AM EST = `'0 13 * * *'`
- **PST (UTC-8)**: 8 AM PST = `'0 16 * * *'`  
- **GMT (UTC+0)**: 8 AM GMT = `'0 8 * * *'`

## ✅ Step 4: Enable & Monitor
- [ ] **Workflow is active**: Check Actions tab shows "Active"
- [ ] **First automatic run**: Wait for next scheduled time
- [ ] **Monitor regularly**: Check Actions tab for failed runs

## 🎯 Quick Commands

### Manual Run
1. Actions tab → EAssistant Daily Summary → Run workflow

### Check Status  
1. Actions tab → View recent runs

### Update Credentials
1. Settings → Secrets and variables → Actions → Update secret

## 🚨 Troubleshooting Quick Fixes

**❌ No email received**: Check spam folder, verify `NOTIFICATION_EMAIL`
**❌ Authentication failed**: Re-enter secrets (copy-paste carefully)  
**❌ Workflow disabled**: Actions tab → Enable workflow
**❌ Wrong timezone**: Use UTC converter or update cron schedule

## 📱 Success Indicators
- [ ] ✅ Manual workflow run completes successfully
- [ ] 📧 Summary email received in inbox
- [ ] 📊 Job summary shows email/event counts
- [ ] 🔄 Workflow shows "Active" status

---

**Time to complete**: ~10 minutes  
**Monthly cost**: $0 (GitHub free tier)  
**Maintenance**: Check failed runs occasionally

🎉 **Done! Your AI assistant now runs automatically in the cloud!**