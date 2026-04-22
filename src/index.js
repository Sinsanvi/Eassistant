const GoogleCalendarService = require('./googleCalendar');
const GmailService = require('./gmailService');
const AIService = require('./aiService');
const PriorityService = require('./priorityService');
const MeetingService = require('./meetingService');
const EmailSender = require('./emailSender');
const config = require('./config');
const moment = require('moment');

class EAssistant {
  constructor() {
    this.calendarService = new GoogleCalendarService();
    this.gmailService = new GmailService();
    this.aiService = new AIService();
    this.priorityService = new PriorityService();
    this.meetingService = new MeetingService();
    this.emailSender = new EmailSender();
  }

  async generateSummary() {
    try {
      console.log('🤖 Starting daily summary generation...');
      const startTime = Date.now();

      // Gather data in parallel for better performance
      console.log('📊 Collecting data...');
      const [emails, events, recentEmails] = await Promise.all([
        this.gmailService.getUnreadEmails().catch(err => {
          console.warn('Failed to get unread emails:', err.message);
          return [];
        }),
        this.calendarService.getTodaysEvents().catch(err => {
          console.warn('Failed to get calendar events:', err.message);
          return [];
        }),
        this.gmailService.getRecentEmails(12).catch(err => {
          console.warn('Failed to get recent emails:', err.message);
          return [];
        })
      ]);

      console.log(`📧 Found ${emails.length} unread emails and ${events.length} events`);

      // Analyze priorities
      console.log('🔍 Analyzing priorities...');
      const emailsWithPriority = await this.analyzeEmailPriorities(emails);
      const eventsWithPriority = await this.analyzeEventPriorities(events);

      // Generate priority report
      const priorityReport = this.priorityService.formatPriorityReport(
        emailsWithPriority,
        eventsWithPriority
      );

      // Generate AI summary
      console.log('🤖 Generating AI summary...');
      const combinedData = this.formatDataForAI(emailsWithPriority, eventsWithPriority);
      const aiSummary = await this.aiService.summarizeContent(combinedData, 'mixed');

      // Analyze schedule conflicts
      console.log('⚠️ Checking for schedule conflicts...');
      const conflicts = await this.meetingService.analyzeScheduleConflicts();

      // Find available slots for meetings
      console.log('🕐 Finding available meeting slots...');
      const availableSlots = await this.meetingService.findAvailableSlots(60, 3);

      // Prepare summary data
      const summaryData = {
        emails: emailsWithPriority,
        events: eventsWithPriority,
        priorityReport,
        aiSummary,
        conflicts,
        availableSlots: availableSlots.slice(0, 10),
        generationTime: Date.now() - startTime
      };

      // Send summary email
      console.log('📤 Sending summary email...');
      const emailResult = await this.emailSender.sendSummaryEmail(summaryData);

      const result = {
        success: emailResult.success,
        timestamp: moment().toISOString(),
        summary: {
          emailsProcessed: emails.length,
          eventsAnalyzed: events.length,
          highPriorityEmails: priorityReport.summary.highPriorityEmails,
          highPriorityEvents: priorityReport.summary.highPriorityEvents,
          conflictsFound: conflicts.length,
          availableSlots: availableSlots.length
        },
        emailDelivery: emailResult,
        processingTime: Date.now() - startTime
      };

      console.log(`✅ Summary generation completed in ${result.processingTime}ms`);
      return result;

    } catch (error) {
      console.error('❌ Error generating summary:', error.message);
      return {
        success: false,
        error: error.message,
        timestamp: moment().toISOString()
      };
    }
  }

  async analyzeEmailPriorities(emails) {
    const emailsWithPriority = [];
    
    for (const email of emails) {
      try {
        const priorityAnalysis = await this.priorityService.analyzeEmailPriority(email);
        emailsWithPriority.push({
          ...this.gmailService.formatEmailForSummary(email),
          priority: priorityAnalysis.priority,
          priorityScore: priorityAnalysis.score,
          priorityReasons: priorityAnalysis.reasons
        });
      } catch (error) {
        console.warn(`Failed to analyze priority for email ${email.id}:`, error.message);
        emailsWithPriority.push({
          ...this.gmailService.formatEmailForSummary(email),
          priority: 'medium',
          priorityScore: 50,
          priorityReasons: ['Default priority - analysis failed']
        });
      }
    }

    return emailsWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  async analyzeEventPriorities(events) {
    const eventsWithPriority = [];
    
    for (const event of events) {
      try {
        const priorityAnalysis = await this.priorityService.analyzeCalendarEventPriority(event);
        eventsWithPriority.push({
          ...this.calendarService.formatEventForSummary(event),
          priority: priorityAnalysis.priority,
          priorityScore: priorityAnalysis.score,
          priorityReasons: priorityAnalysis.reasons
        });
      } catch (error) {
        console.warn(`Failed to analyze priority for event ${event.id}:`, error.message);
        eventsWithPriority.push({
          ...this.calendarService.formatEventForSummary(event),
          priority: 'medium',
          priorityScore: 50,
          priorityReasons: ['Default priority - analysis failed']
        });
      }
    }

    return eventsWithPriority.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  formatDataForAI(emails, events) {
    let data = 'DAILY SUMMARY DATA:\n\n';
    
    data += 'HIGH PRIORITY EMAILS:\n';
    const highPriorityEmails = emails.filter(e => e.priority === 'high').slice(0, 5);
    if (highPriorityEmails.length > 0) {
      highPriorityEmails.forEach(email => {
        data += `- Subject: ${email.subject}\n  From: ${email.from}\n  Snippet: ${email.snippet}\n\n`;
      });
    } else {
      data += '- No high priority emails\n\n';
    }

    data += 'TODAY\'S CALENDAR EVENTS:\n';
    if (events.length > 0) {
      events.forEach(event => {
        data += `- ${event.title} (${event.start})\n`;
        if (event.description) data += `  Description: ${event.description.substring(0, 100)}\n`;
      });
    } else {
      data += '- No events scheduled\n';
    }

    data += '\nMEDIUM PRIORITY EMAILS:\n';
    const mediumPriorityEmails = emails.filter(e => e.priority === 'medium').slice(0, 3);
    mediumPriorityEmails.forEach(email => {
      data += `- ${email.subject} from ${email.from}\n`;
    });

    return data;
  }

  async bookMeeting(meetingDetails) {
    try {
      console.log('📅 Attempting to book meeting:', meetingDetails.title);
      const result = await this.meetingService.bookMeeting(meetingDetails);
      
      if (result.success) {
        console.log('✅ Meeting booked successfully');
        
        // Send confirmation email if requested
        if (meetingDetails.sendConfirmation) {
          const confirmationData = {
            meetingDetails: meetingDetails,
            calendarEvent: result.event,
            timestamp: moment().toISOString()
          };
          
          // Could implement a meeting confirmation email here
          console.log('📧 Meeting confirmation would be sent here');
        }
      } else {
        console.log('❌ Failed to book meeting:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error booking meeting:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async findMeetingSlots(duration = 60, daysAhead = 7) {
    try {
      console.log(`🔍 Finding available ${duration}-minute slots for next ${daysAhead} days`);
      const slots = await this.meetingService.findAvailableSlots(duration, daysAhead);
      
      return {
        success: true,
        slots: slots,
        count: slots.length
      };
    } catch (error) {
      console.error('❌ Error finding meeting slots:', error.message);
      return {
        success: false,
        error: error.message,
        slots: []
      };
    }
  }

  async testConnection() {
    console.log('🔧 Testing all service connections...');
    
    const tests = {
      gmail: false,
      calendar: false,
      email: false,
      ai: false
    };

    try {
      // Test Gmail connection
      await this.gmailService.getUserProfile();
      tests.gmail = true;
      console.log('✅ Gmail connection successful');
    } catch (error) {
      console.log('❌ Gmail connection failed:', error.message);
    }

    try {
      // Test Calendar connection
      await this.calendarService.getTodaysEvents();
      tests.calendar = true;
      console.log('✅ Calendar connection successful');
    } catch (error) {
      console.log('❌ Calendar connection failed:', error.message);
    }

    try {
      // Test Email sender
      const emailTest = await this.emailSender.testConnection();
      tests.email = emailTest.success;
      console.log(emailTest.success ? '✅ Email sender connection successful' : `❌ Email sender failed: ${emailTest.error}`);
    } catch (error) {
      console.log('❌ Email sender test failed:', error.message);
    }

    try {
      // Test AI service with a simple call
      await this.aiService.summarizeContent('Test content', 'mixed');
      tests.ai = true;
      console.log('✅ AI service connection successful');
    } catch (error) {
      console.log('❌ AI service failed, will use fallback:', error.message);
      tests.ai = false; // Fallback is acceptable
    }

    const allPassing = tests.gmail && tests.calendar && tests.email;
    console.log(`\n📊 Connection Test Results:`);
    console.log(`Gmail: ${tests.gmail ? '✅' : '❌'}`);
    console.log(`Calendar: ${tests.calendar ? '✅' : '❌'}`);
    console.log(`Email: ${tests.email ? '✅' : '❌'}`);
    console.log(`AI: ${tests.ai ? '✅' : '⚠️ (fallback available)'}`);
    console.log(`Overall: ${allPassing ? '✅ Ready to run' : '❌ Configuration needed'}`);

    return {
      success: allPassing,
      tests: tests,
      message: allPassing ? 'All critical services connected' : 'Some services need configuration'
    };
  }
}

// CLI Interface
async function main() {
  const assistant = new EAssistant();
  const command = process.argv[2];

  switch (command) {
    case 'summary':
    case 'run':
      const result = await assistant.generateSummary();
      console.log('\n📋 Summary Result:', JSON.stringify(result, null, 2));
      break;
      
    case 'test':
      await assistant.testConnection();
      break;
      
    case 'slots':
      const duration = parseInt(process.argv[3]) || 60;
      const days = parseInt(process.argv[4]) || 7;
      const slotsResult = await assistant.findMeetingSlots(duration, days);
      console.log('\n🕐 Available Slots:', JSON.stringify(slotsResult, null, 2));
      break;
      
    case 'book':
      // Example booking - in real use, this would come from email parsing or API
      const sampleMeeting = {
        title: 'Sample Meeting',
        description: 'Test meeting booking',
        startTime: moment().add(1, 'day').hour(14).minute(0).toISOString(),
        endTime: moment().add(1, 'day').hour(15).minute(0).toISOString(),
        attendees: []
      };
      const bookResult = await assistant.bookMeeting(sampleMeeting);
      console.log('\n📅 Booking Result:', JSON.stringify(bookResult, null, 2));
      break;
      
    default:
      console.log(`
🤖 E-Assistant CLI Commands:

  npm start summary     Generate and send daily summary
  npm start test        Test all service connections  
  npm start slots [duration] [days]  Find available meeting slots
  npm start book        Book a sample meeting (for testing)

Examples:
  npm start summary
  npm start slots 30 5
  npm start test
      `);
  }
}

// Export for use in other modules
module.exports = EAssistant;

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}