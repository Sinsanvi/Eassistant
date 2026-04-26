const nodemailer = require('nodemailer');
const moment = require('moment');
const config = require('./config');

class EmailSender {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      const emailConfig = {
        service: config.get('email.service'),
        auth: {
          user: config.get('email.user'),
          pass: config.get('email.password')
        }
      };

      this.transporter = nodemailer.createTransport(emailConfig);
    } catch (error) {
      console.error('Error setting up email transporter:', error.message);
    }
  }

  async sendSummaryEmail(summaryData) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }

      // Support for custom content (used by AutoMeetingService)
      if (summaryData.customContent) {
        const recipientEmail = summaryData.recipientOverride || config.get('notification.recipientEmail');
        if (!recipientEmail) {
          throw new Error('No recipient email configured');
        }

        const mailOptions = {
          from: config.get('email.user'),
          to: recipientEmail,
          subject: summaryData.customContent.subject,
          html: summaryData.customContent.html,
          text: summaryData.customContent.text
        };

        const result = await this.transporter.sendMail(mailOptions);
        
        console.log('Custom email sent successfully:', result.messageId);
        return {
          success: true,
          messageId: result.messageId,
          timestamp: moment().toISOString()
        };
      }

      // Regular summary email
      const recipientEmail = config.get('notification.recipientEmail');
      if (!recipientEmail) {
        throw new Error('No recipient email configured');
      }

      const emailContent = this.generateEmailContent(summaryData);
      
      const mailOptions = {
        from: config.get('email.user'),
        to: recipientEmail,
        subject: `📊 Daily Summary - ${moment().format('MMMM Do, YYYY')}`,
        html: emailContent.html,
        text: emailContent.text
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      console.log('Summary email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId,
        timestamp: moment().toISOString()
      };
    } catch (error) {
      console.error('Error sending summary email:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: moment().toISOString()
      };
    }
  }

  generateEmailContent(data) {
    const { 
      emails, 
      events, 
      priorityReport, 
      aiSummary, 
      conflicts, 
      availableSlots,
      meetingRequests 
    } = data;

    const currentTime = moment().format('MMMM Do, YYYY [at] h:mm A');
    
    // HTML Content
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .section { background: #f8f9fa; padding: 15px; margin-bottom: 15px; border-radius: 8px; border-left: 4px solid #667eea; }
            .priority-high { border-left-color: #dc3545; background: #fff5f5; }
            .priority-medium { border-left-color: #ffc107; background: #fffbf0; }
            .priority-low { border-left-color: #28a745; background: #f8fff8; }
            .email-item, .event-item { margin: 8px 0; padding: 10px; background: white; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .timestamp { color: #666; font-size: 0.9em; }
            .emoji { font-size: 1.2em; margin-right: 8px; }
            .summary-stats { display: flex; gap: 20px; flex-wrap: wrap; }
            .stat-card { background: white; padding: 15px; border-radius: 8px; text-align: center; flex: 1; min-width: 120px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .conflict-warning { background: #ffe6e6; border: 1px solid #ff9999; color: #cc0000; padding: 10px; border-radius: 6px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>📊 Daily Assistant Summary</h1>
                <p>Generated on ${currentTime}</p>
            </div>

            ${this.generateSummaryStats(priorityReport)}
            ${this.generateAISummarySection(aiSummary)}
            ${this.generateHighPrioritySection(priorityReport)}
            ${this.generateTodaysScheduleSection(events)}
            ${this.generateConflictsSection(conflicts)}
            ${this.generateMeetingRequestsSection(meetingRequests)}
            ${this.generateAvailableSlotsSection(availableSlots)}
            ${this.generateRecentEmailsSection(priorityReport)}
            
            <div class="section">
                <h3><span class="emoji">⚙️</span>System Information</h3>
                <p><strong>AI Analysis:</strong> ${aiSummary ? 'Enabled' : 'Using fallback analysis'}</p>
                <p><strong>Emails Processed:</strong> ${emails ? emails.length : 0}</p>
                <p><strong>Events Analyzed:</strong> ${events ? events.length : 0}</p>
                <p><strong>Next Summary:</strong> ${this.getNextSummaryTime()}</p>
            </div>
        </div>
    </body>
    </html>`;

    // Plain Text Content
    const text = `
DAILY ASSISTANT SUMMARY
Generated on ${currentTime}

SUMMARY STATS:
- Total Emails: ${emails ? emails.length : 0}
- High Priority Emails: ${priorityReport ? priorityReport.summary.highPriorityEmails : 0}
- Today's Events: ${events ? events.length : 0}
- High Priority Events: ${priorityReport ? priorityReport.summary.highPriorityEvents : 0}

${aiSummary ? `AI SUMMARY:\n${aiSummary}\n` : ''}

HIGH PRIORITY EMAILS:
${priorityReport && priorityReport.highPriorityEmails ? 
  priorityReport.highPriorityEmails.map(email => `• ${email.subject} - From: ${email.from}`).join('\n') :
  'No high priority emails'}

TODAY'S SCHEDULE:
${events ? events.map(event => `• ${event.title} at ${event.start}`).join('\n') : 'No events scheduled'}

${conflicts && conflicts.length > 0 ? 
  `SCHEDULE CONFLICTS:\n${conflicts.map(c => `• ${c.recommendation}`).join('\n')}\n` : ''}

Next summary: ${this.getNextSummaryTime()}
`;

    return { html, text };
  }

  generateSummaryStats(priorityReport) {
    if (!priorityReport) return '';
    
    return `
    <div class="section">
        <h3><span class="emoji">📈</span>Summary Statistics</h3>
        <div class="summary-stats">
            <div class="stat-card">
                <h4>${priorityReport.summary.totalEmails}</h4>
                <p>Total Emails</p>
            </div>
            <div class="stat-card">
                <h4>${priorityReport.summary.highPriorityEmails}</h4>
                <p>High Priority</p>
            </div>
            <div class="stat-card">
                <h4>${priorityReport.summary.totalEvents}</h4>
                <p>Calendar Events</p>
            </div>
            <div class="stat-card">
                <h4>${priorityReport.summary.highPriorityEvents}</h4>
                <p>Important Meetings</p>
            </div>
        </div>
    </div>`;
  }

  generateAISummarySection(aiSummary) {
    if (!aiSummary) return '';
    
    return `
    <div class="section priority-high">
        <h3><span class="emoji">🤖</span>AI Analysis Summary</h3>
        <div style="background: white; padding: 15px; border-radius: 6px; white-space: pre-wrap;">${aiSummary}</div>
    </div>`;
  }

  generateHighPrioritySection(priorityReport) {
    if (!priorityReport || !priorityReport.highPriorityEmails || priorityReport.highPriorityEmails.length === 0) {
      return `
      <div class="section priority-low">
          <h3><span class="emoji">✅</span>High Priority Items</h3>
          <p>No high priority emails or events requiring immediate attention.</p>
      </div>`;
    }

    const emailItems = priorityReport.highPriorityEmails.map(email => `
      <div class="email-item">
          <strong>${email.subject}</strong><br>
          <span class="timestamp">From: ${email.from} • ${email.date}</span><br>
          <p>${email.snippet}</p>
      </div>
    `).join('');

    const eventItems = priorityReport.highPriorityEvents ? priorityReport.highPriorityEvents.map(event => `
      <div class="event-item">
          <strong>${event.title}</strong><br>
          <span class="timestamp">${event.start} - ${event.end}</span><br>
          <p>${event.description || 'No description'}</p>
      </div>
    `).join('') : '';

    return `
    <div class="section priority-high">
        <h3><span class="emoji">🔴</span>High Priority Items</h3>
        ${emailItems}
        ${eventItems}
    </div>`;
  }

  generateTodaysScheduleSection(events) {
    if (!events || events.length === 0) {
      return `
      <div class="section">
          <h3><span class="emoji">📅</span>Today's Schedule</h3>
          <p>No events scheduled for today.</p>
      </div>`;
    }

    const eventItems = events.slice(0, 8).map(event => `
      <div class="event-item">
          <strong>${event.title}</strong><br>
          <span class="timestamp">${event.start}${event.end ? ` - ${event.end}` : ''}</span><br>
          ${event.location ? `<p>📍 ${event.location}</p>` : ''}
      </div>
    `).join('');

    return `
    <div class="section">
        <h3><span class="emoji">📅</span>Today's Schedule</h3>
        ${eventItems}
    </div>`;
  }

  generateConflictsSection(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      return '';
    }

    const conflictItems = conflicts.map(conflict => `
      <div class="conflict-warning">
          <strong>⚠️ ${conflict.type === 'back-to-back' ? 'Scheduling Conflict' : 'Long Meeting Alert'}</strong><br>
          ${conflict.recommendation}
      </div>
    `).join('');

    return `
    <div class="section">
        <h3><span class="emoji">⚠️</span>Schedule Conflicts</h3>
        ${conflictItems}
    </div>`;
  }

  generateMeetingRequestsSection(meetingRequests) {
    if (!meetingRequests || meetingRequests.summary.total === 0) {
      return '';
    }

    const { summary, requests } = meetingRequests;
    const status = summary.successful === summary.total ? 'priority-low' : 
                   summary.successful > 0 ? 'priority-medium' : 'priority-high';

    const requestItems = requests.map(req => `
      <div style="background: white; padding: 10px; margin: 5px 0; border-radius: 6px; border-left: 3px solid ${req.result ? '#28a745' : '#dc3545'};">
          <div style="font-weight: bold; color: ${req.result ? '#28a745' : '#dc3545'};">
            ${req.result ? '✅' : '❌'} ${req.title}
          </div>
          <div style="font-size: 0.9em; color: #666; margin-top: 5px;">
            From: ${req.sender} • Confidence: ${(req.confidence * 100).toFixed(1)}%
            ${req.error ? `<br><span style="color: #dc3545;">Error: ${req.error}</span>` : ''}
          </div>
      </div>
    `).join('');

    return `
    <div class="section ${status}">
        <h3><span class="emoji">🤖</span>Automated Meeting Requests</h3>
        <p>Processed ${summary.total} meeting request(s): ${summary.successful} successful, ${summary.failed} failed</p>
        ${requestItems}
        ${summary.failed > 0 ? '<p style="color: #dc3545; font-size: 0.9em; margin-top: 10px;">Failed requests have been replied to with troubleshooting instructions.</p>' : ''}
    </div>`;
  }

  generateAvailableSlotsSection(availableSlots) {
    if (!availableSlots || availableSlots.length === 0) {
      return '';
    }

    const slotItems = availableSlots.slice(0, 5).map(slot => `
      <div style="background: white; padding: 8px; margin: 4px 0; border-radius: 4px;">
          ${moment(slot.start).format('MMM Do, h:mm A')} - ${moment(slot.end).format('h:mm A')} (${slot.duration} min)
      </div>
    `).join('');

    return `
    <div class="section priority-low">
        <h3><span class="emoji">🕐</span>Available Time Slots</h3>
        <p>Next available slots for scheduling meetings:</p>
        ${slotItems}
    </div>`;
  }

  generateRecentEmailsSection(priorityReport) {
    if (!priorityReport || !priorityReport.mediumPriorityEmails || priorityReport.mediumPriorityEmails.length === 0) {
      return '';
    }

    const emailItems = priorityReport.mediumPriorityEmails.map(email => `
      <div class="email-item" style="background: #f8f9fa;">
          <strong>${email.subject}</strong><br>
          <span class="timestamp">From: ${email.from} • ${email.date}</span>
      </div>
    `).join('');

    return `
    <div class="section priority-medium">
        <h3><span class="emoji">📧</span>Medium Priority Emails</h3>
        ${emailItems}
        ${priorityReport.lowPriorityCount > 0 ? 
          `<p style="margin-top: 15px; color: #666;">+ ${priorityReport.lowPriorityCount} low priority emails</p>` : 
          ''
        }
    </div>`;
  }

  getNextSummaryTime() {
    const summaryTimes = config.get('scheduling.summaryTimes') || ['08:00', '17:00'];
    const now = moment();
    const today = now.format('YYYY-MM-DD');
    
    for (const time of summaryTimes) {
      const nextSummary = moment(`${today} ${time}`);
      if (nextSummary.isAfter(now)) {
        return nextSummary.format('h:mm A');
      }
    }
    
    // Next summary is tomorrow morning
    const tomorrow = now.clone().add(1, 'day').format('YYYY-MM-DD');
    return moment(`${tomorrow} ${summaryTimes[0]}`).format('MMM Do, h:mm A');
  }

  async testConnection() {
    try {
      if (!this.transporter) {
        return { success: false, error: 'Transporter not configured' };
      }

      await this.transporter.verify();
      return { success: true, message: 'Email connection successful' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = EmailSender;