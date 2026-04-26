const GoogleCalendarService = require('./googleCalendar');
const MeetingService = require('./meetingService');
const EmailSender = require('./emailSender');
const moment = require('moment-timezone');
const config = require('./config');

class MeetingBooker {
  constructor() {
    this.calendarService = new GoogleCalendarService();
    this.meetingService = new MeetingService();
    this.emailSender = new EmailSender();
    this.timeZone = config.get('scheduling.timeZone') || 'America/New_York';
  }

  async bookMeeting(options) {
    try {
      console.log('🤖 Starting meeting booking process...');
      
      // Parse and validate meeting details
      const meetingDetails = this.parseMeetingOptions(options);
      console.log(`📅 Booking: ${meetingDetails.title}`);
      console.log(`📅 Date: ${moment(meetingDetails.startTime).tz(this.timeZone).format('MMMM Do, YYYY [at] h:mm A z')}`);
      console.log(`👥 Attendees: ${meetingDetails.attendees.map(a => a.email).join(', ')}`);
      
      // Check availability
      console.log('🔍 Checking calendar availability...');
      const isAvailable = await this.calendarService.checkAvailability(
        meetingDetails.startTime,
        meetingDetails.endTime
      );

      if (!isAvailable) {
        console.log('❌ Time slot conflicts with existing meetings');
        const alternatives = await this.findAlternatives(meetingDetails);
        return {
          success: false,
          error: 'Time slot not available',
          conflictFound: true,
          alternatives: alternatives
        };
      }

      // Validate working hours
      if (!this.meetingService.isWithinWorkingHours(meetingDetails.startTime, meetingDetails.endTime)) {
        console.log('⚠️ Warning: Meeting scheduled outside working hours');
      }

      // Book the meeting
      console.log('📝 Creating calendar event...');
      const result = await this.meetingService.bookMeeting(meetingDetails);

      if (result.success) {
        console.log('✅ Meeting booked successfully!');
        
        // Send confirmation email if requested
        if (options.sendConfirmation) {
          await this.sendConfirmationEmail(meetingDetails, result.event);
        }

        return {
          success: true,
          meeting: result.event,
          details: meetingDetails,
          message: 'Meeting successfully created and invitations sent'
        };
      } else {
        console.log('❌ Failed to book meeting:', result.error);
        return result;
      }

    } catch (error) {
      console.error('💥 Error in meeting booking:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  parseMeetingOptions(options) {
    const {
      title = 'Team Meeting',
      description = 'Meeting scheduled via EAssistant',
      date,
      time,
      duration = 60,
      attendees = [],
      timezone = this.timeZone
    } = options;

    // Parse date and time
    let startMoment;
    
    if (options.startTime) {
      // Direct ISO string provided
      startMoment = moment(options.startTime).tz(timezone);
    } else if (date && time) {
      // Separate date and time provided
      startMoment = moment.tz(`${date} ${time}`, 'YYYY-MM-DD HH:mm', timezone);
    } else {
      throw new Error('Meeting date and time must be provided');
    }

    if (!startMoment.isValid()) {
      throw new Error('Invalid date or time format');
    }

    const endMoment = startMoment.clone().add(duration, 'minutes');

    // Format attendees
    console.log(`🔍 DEBUG MeetingBooker - Raw attendees input:`, JSON.stringify(attendees));
    const formattedAttendees = attendees.map(email => 
      typeof email === 'string' ? { email: email.trim() } : email
    );
    console.log(`🔍 DEBUG MeetingBooker - Formatted attendees:`, JSON.stringify(formattedAttendees));

    return {
      title,
      description,
      startTime: startMoment.toISOString(),
      endTime: endMoment.toISOString(),
      attendees: formattedAttendees,
      duration
    };
  }

  async findAlternatives(originalMeeting) {
    try {
      const duration = moment(originalMeeting.endTime).diff(moment(originalMeeting.startTime), 'minutes');
      const alternatives = await this.meetingService.suggestAlternativeSlots(originalMeeting);
      
      return alternatives.slice(0, 5).map(slot => ({
        start: slot.start,
        end: slot.end,
        date: slot.date,
        dayOfWeek: slot.dayOfWeek,
        formatted: `${slot.startFormatted} - ${slot.endFormatted}`,
        timezone: this.timeZone
      }));
    } catch (error) {
      console.warn('Failed to find alternatives:', error.message);
      return [];
    }
  }

  async findAvailableSlots(options = {}) {
    try {
      const {
        duration = 60,
        days = 7,
        startDate = moment().tz(this.timeZone)
      } = options;

      console.log(`🔍 Finding ${duration}-minute slots for next ${days} days...`);
      
      const slots = await this.meetingService.findAvailableSlots(duration, days);
      
      const formattedSlots = slots.map(slot => ({
        start: slot.start,
        end: slot.end,
        date: moment(slot.start).tz(this.timeZone).format('YYYY-MM-DD'),
        time: moment(slot.start).tz(this.timeZone).format('HH:mm'),
        formatted: moment(slot.start).tz(this.timeZone).format('MMM Do, h:mm A'),
        dayOfWeek: moment(slot.start).tz(this.timeZone).format('dddd'),
        duration: duration
      }));

      return {
        success: true,
        slots: formattedSlots,
        count: formattedSlots.length,
        duration: duration,
        searchDays: days
      };
    } catch (error) {
      console.error('Error finding available slots:', error.message);
      return {
        success: false,
        error: error.message,
        slots: []
      };
    }
  }

  async sendConfirmationEmail(meetingDetails, calendarEvent) {
    try {
      const emailContent = this.generateConfirmationEmail(meetingDetails, calendarEvent);
      
      const result = await this.emailSender.sendSummaryEmail({
        customContent: emailContent,
        subject: `Meeting Confirmation: ${meetingDetails.title}`
      });

      if (result.success) {
        console.log('📧 Confirmation email sent successfully');
      } else {
        console.warn('Failed to send confirmation email:', result.error);
      }

      return result;
    } catch (error) {
      console.warn('Error sending confirmation email:', error.message);
      return { success: false, error: error.message };
    }
  }

  generateConfirmationEmail(meetingDetails, calendarEvent) {
    const startTime = moment(meetingDetails.startTime).tz(this.timeZone);
    const endTime = moment(meetingDetails.endTime).tz(this.timeZone);

    return {
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px;">
            <h1>📅 Meeting Confirmed</h1>
            <p>Your meeting has been successfully scheduled</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
            <h2>${meetingDetails.title}</h2>
            <p><strong>📅 Date:</strong> ${startTime.format('MMMM Do, YYYY')}</p>
            <p><strong>🕐 Time:</strong> ${startTime.format('h:mm A')} - ${endTime.format('h:mm A')} ${startTime.format('z')}</p>
            <p><strong>⏱️ Duration:</strong> ${meetingDetails.duration} minutes</p>
            ${meetingDetails.description ? `<p><strong>📝 Description:</strong> ${meetingDetails.description}</p>` : ''}
          </div>
          
          ${meetingDetails.attendees.length > 0 ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px;">
            <h3>👥 Attendees</h3>
            <ul>
              ${meetingDetails.attendees.map(a => `<li>${a.email}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #28a745;">
            <p><strong>✅ Calendar invitations have been sent to all attendees</strong></p>
            <p>📱 You'll receive reminder notifications before the meeting</p>
          </div>
          
          <p style="margin-top: 20px; color: #666; font-size: 0.9em;">
            This meeting was scheduled automatically by EAssistant
          </p>
        </div>
      `,
      text: `
Meeting Confirmed: ${meetingDetails.title}

Date: ${startTime.format('MMMM Do, YYYY')}
Time: ${startTime.format('h:mm A')} - ${endTime.format('h:mm A')} ${startTime.format('z')}
Duration: ${meetingDetails.duration} minutes

${meetingDetails.attendees.length > 0 ? 
  `Attendees: ${meetingDetails.attendees.map(a => a.email).join(', ')}` : ''}

Calendar invitations have been sent to all attendees.
You'll receive reminder notifications before the meeting.

Scheduled by EAssistant
      `
    };
  }

  // Quick booking methods for common scenarios
  async bookTomorrow(time, attendees, title = 'Meeting') {
    const tomorrow = moment().tz(this.timeZone).add(1, 'day');
    const [hour, minute] = time.split(':').map(Number);
    const meetingTime = tomorrow.hour(hour).minute(minute || 0);

    return this.bookMeeting({
      title,
      startTime: meetingTime.toISOString(),
      attendees: Array.isArray(attendees) ? attendees : [attendees],
      sendConfirmation: true
    });
  }

  async bookNextWeek(dayOfWeek, time, attendees, title = 'Weekly Meeting') {
    const nextWeek = moment().tz(this.timeZone).add(1, 'week').day(dayOfWeek);
    const [hour, minute] = time.split(':').map(Number);
    const meetingTime = nextWeek.hour(hour).minute(minute || 0);

    return this.bookMeeting({
      title,
      startTime: meetingTime.toISOString(),
      attendees: Array.isArray(attendees) ? attendees : [attendees],
      sendConfirmation: true
    });
  }
}

module.exports = MeetingBooker;