const EmailParser = require('./emailParser');
const GitHubApiService = require('./githubApiService');
const EmailSender = require('./emailSender');
const moment = require('moment-timezone');
const config = require('./config');

class AutoMeetingService {
  constructor() {
    this.emailParser = new EmailParser();
    this.githubService = new GitHubApiService();
    this.emailSender = new EmailSender();
    this.timeZone = config.get('scheduling.timeZone') || 'America/New_York';
    
    // Track processed requests to avoid duplicates
    this.processedRequests = new Map();
  }

  async processEmailsForMeetingRequests(emails) {
    const meetingRequests = [];
    
    console.log(`🔍 Scanning ${emails.length} emails for meeting requests...`);
    
    // Track processed email IDs to prevent duplicates
    const processedInThisRun = new Set();
    
    for (const email of emails) {
      try {
        // Skip if already processed in previous runs
        if (this.processedRequests.has(email.id)) {
          console.log(`⏭️ Skipping email ${email.id} - already processed in previous run`);
          continue;
        }
        
        // Skip if already processed in this run (deduplication)
        if (processedInThisRun.has(email.id)) {
          console.log(`⏭️ Skipping email ${email.id} - already processed in this run`);
          continue;
        }
        
        processedInThisRun.add(email.id);
        
        // Parse the email for meeting request
        const parsed = this.emailParser.parseMeetingRequest(
          email.subject,
          email.body,
          email.from
        );
        
        if (parsed && parsed.confidence >= 0.6) {
          console.log(`📅 Found meeting request from ${email.from}: "${parsed.title}"`);
          console.log(`📊 Confidence: ${(parsed.confidence * 100).toFixed(1)}%`);
          
          meetingRequests.push({
            emailId: email.id,
            email: email,
            parsed: parsed,
            processedAt: moment().toISOString()
          });
          
          // Mark as processed
          this.processedRequests.set(email.id, true);
        }
      } catch (error) {
        console.warn(`Error processing email ${email.id}:`, error.message);
      }
    }
    
    return meetingRequests;
  }

  async processMeetingRequests(meetingRequests) {
    const results = [];
    
    for (const request of meetingRequests) {
      try {
        console.log(`\n🤖 Processing meeting request from ${request.parsed.senderEmail}`);
        
        const result = await this.handleMeetingRequest(request);
        results.push(result);
        
        // Send response email
        await this.sendResponseEmail(request, result);
        
        // Add delay between requests to avoid rate limiting
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`Error processing meeting request:`, error.message);
        results.push({
          success: false,
          error: error.message,
          request: request
        });
      }
    }
    
    return results;
  }

  async handleMeetingRequest(request) {
    try {
      const { parsed, email } = request;
      
      // Format meeting details for GitHub workflow
      const formattedMeeting = this.emailParser.formatParsedMeeting(parsed);
      
      if (!formattedMeeting) {
        throw new Error('Unable to extract sufficient meeting details');
      }
      
      console.log(`📝 Meeting details extracted:`);
      console.log(`   Title: ${formattedMeeting.title}`);
      console.log(`   Date: ${formattedMeeting.date}`);
      console.log(`   Time: ${formattedMeeting.time}`);
      console.log(`   Attendees: ${formattedMeeting.attendees}`);
      console.log(`   Duration: ${formattedMeeting.duration} minutes`);
      console.log(`🔍 DEBUG - Parsed attendees array:`, JSON.stringify(parsed.attendees));
      console.log(`🔍 DEBUG - Formatted attendees string: "${formattedMeeting.attendees}"`);
      
      // Trigger GitHub workflow
      const workflowResult = await this.githubService.triggerMeetingBooking(formattedMeeting);
      
      if (workflowResult.success) {
        console.log('✅ GitHub workflow triggered successfully');
        
        return {
          success: true,
          message: 'Meeting booking workflow triggered',
          meetingDetails: formattedMeeting,
          workflowResult: workflowResult,
          request: request
        };
      } else {
        console.log('❌ Failed to trigger GitHub workflow');
        
        return {
          success: false,
          error: 'Failed to trigger meeting booking workflow',
          details: workflowResult.error,
          meetingDetails: formattedMeeting,
          request: request
        };
      }
    } catch (error) {
      console.error('Error handling meeting request:', error.message);
      return {
        success: false,
        error: error.message,
        request: request
      };
    }
  }

  async sendResponseEmail(request, result) {
    try {
      const { parsed, email } = request;
      
      const responseContent = this.generateResponseEmail(parsed, result);
      
      // Send response to the original sender
      const emailResult = await this.emailSender.sendSummaryEmail({
        customContent: responseContent,
        recipientOverride: parsed.senderEmail
      });
      
      if (emailResult.success) {
        console.log(`📧 Response sent to ${parsed.senderEmail}`);
      } else {
        console.warn(`Failed to send response email: ${emailResult.error}`);
      }
      
      return emailResult;
    } catch (error) {
      console.warn('Error sending response email:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateResponseEmail(parsed, result) {
    const isSuccess = result.success;
    const meetingTime = parsed.dateTime ? 
      moment(parsed.dateTime.dateTime).tz(this.timeZone).format('MMMM Do, YYYY [at] h:mm A z') : 
      'Unknown time';
    
    const subject = isSuccess ? 
      `✅ Meeting Booking Confirmed: ${parsed.title}` :
      `⚠️ Meeting Booking Issue: ${parsed.title}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${isSuccess ? 'linear-gradient(135deg, #28a745 0%, #20c997 100%)' : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)'}; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
          <h1>${isSuccess ? '✅' : '⚠️'} Meeting Request ${isSuccess ? 'Processed' : 'Needs Attention'}</h1>
          <p>Response to your meeting request</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
          <h2>📅 Meeting Details</h2>
          <p><strong>Title:</strong> ${parsed.title}</p>
          <p><strong>Requested Time:</strong> ${meetingTime}</p>
          <p><strong>Duration:</strong> ${parsed.duration} minutes</p>
          <p><strong>Attendees:</strong> ${parsed.attendees.join(', ')}</p>
          <p><strong>Confidence:</strong> ${(parsed.confidence * 100).toFixed(1)}%</p>
        </div>
        
        ${isSuccess ? `
        <div style="background: #d4edda; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745; margin-bottom: 15px;">
          <h3>🎉 Meeting Booking Initiated</h3>
          <p>Your meeting request has been processed and the booking workflow has been triggered!</p>
          <ul>
            <li>📅 Calendar event creation in progress</li>
            <li>📧 Calendar invitations will be sent to all attendees</li>
            <li>🔔 You'll receive confirmation once the booking is complete</li>
            <li>⏰ Automatic reminders will be set up</li>
          </ul>
          <p><strong>Note:</strong> The meeting will be confirmed within the next few minutes. Check your calendar and email for updates.</p>
        </div>
        ` : `
        <div style="background: #f8d7da; padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; margin-bottom: 15px;">
          <h3>⚠️ Booking Issue</h3>
          <p>We encountered an issue processing your meeting request:</p>
          <p><strong>Error:</strong> ${result.error || 'Unknown error'}</p>
          
          <h4>💡 Possible Solutions:</h4>
          <ul>
            <li>📅 <strong>Check the date/time:</strong> Ensure it's in the future and during working hours</li>
            <li>✉️ <strong>Verify email format:</strong> Make sure attendee emails are correctly formatted</li>
            <li>🔄 <strong>Try rephrasing:</strong> Use clearer language like "Book meeting tomorrow at 2pm with john@company.com"</li>
            <li>⏰ <strong>Specify duration:</strong> Add "for 30 minutes" or similar</li>
          </ul>
          
          <p>Please send another email with the meeting details, or use our GitHub Actions workflow directly.</p>
        </div>
        `}
        
        <div style="background: #e8f4f8; padding: 15px; border-radius: 8px; border-left: 4px solid #17a2b8;">
          <h3>📝 How to Format Meeting Requests</h3>
          <p>For best results, use this format in your email:</p>
          <blockquote style="background: white; padding: 10px; border-left: 3px solid #17a2b8; margin: 10px 0;">
            "Book meeting tomorrow at 2pm with john@company.com for 1 hour"
          </blockquote>
          <p><strong>Include:</strong></p>
          <ul>
            <li>📅 Clear date (tomorrow, Monday, April 26, etc.)</li>
            <li>🕐 Specific time (2pm, 14:00, etc.)</li>
            <li>👥 Attendee email addresses</li>
            <li>⏱️ Duration (optional, defaults to 60 minutes)</li>
          </ul>
        </div>
        
        <hr style="margin: 20px 0;">
        
        <p style="color: #666; font-size: 0.9em;">
          This is an automated response from your EAssistant. The system analyzed your email with ${(parsed.confidence * 100).toFixed(1)}% confidence that it contained a meeting request.
        </p>
        
        <p style="color: #666; font-size: 0.9em;">
          <strong>Need help?</strong> Visit your repository's Actions page for manual booking: 
          <a href="https://github.com/Sinsanvi/Eassistant/actions">GitHub Actions</a>
        </p>
      </div>
    `;
    
    const text = `
Meeting Request ${isSuccess ? 'Processed' : 'Needs Attention'}

Meeting Details:
- Title: ${parsed.title}
- Requested Time: ${meetingTime}
- Duration: ${parsed.duration} minutes
- Attendees: ${parsed.attendees.join(', ')}
- Confidence: ${(parsed.confidence * 100).toFixed(1)}%

${isSuccess ? 
  'Your meeting request has been processed! The booking workflow has been triggered and you should receive calendar invitations shortly.' :
  `Issue: ${result.error || 'Unknown error'}\n\nPlease check the date/time format and try again, or use the GitHub Actions workflow directly.`
}

This is an automated response from your EAssistant.
For manual booking: https://github.com/Sinsanvi/Eassistant/actions
    `;
    
    return {
      subject: subject,
      html: html,
      text: text
    };
  }

  async generateMeetingRequestSummary(requests, results) {
    if (requests.length === 0) {
      return null;
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      summary: {
        total: requests.length,
        successful: successful,
        failed: failed,
        processed_at: moment().toISOString()
      },
      requests: requests.map((request, index) => ({
        sender: request.parsed.senderEmail,
        title: request.parsed.title,
        confidence: request.parsed.confidence,
        result: results[index]?.success || false,
        error: results[index]?.error || null
      }))
    };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  clearProcessedRequests() {
    this.processedRequests.clear();
    console.log('🧹 Cleared processed requests cache');
  }
  
  // Clear old processed requests (older than 24 hours)
  clearOldProcessedRequests() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let cleared = 0;
    
    for (const [emailId, timestamp] of this.processedRequests.entries()) {
      if (timestamp < oneDayAgo) {
        this.processedRequests.delete(emailId);
        cleared++;
      }
    }
    
    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} old processed requests (>24 hours)`);
    }
  }
}

module.exports = AutoMeetingService;