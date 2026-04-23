const GoogleCalendarService = require('./googleCalendar');
const moment = require('moment-timezone');
const config = require('./config');

class MeetingService {
  constructor() {
    this.calendarService = new GoogleCalendarService();
    this.workingHours = config.get('scheduling.workingHours');
    this.timeZone = config.get('scheduling.timeZone');
  }

  async findAvailableSlots(duration = 60, daysAhead = 7, excludeDate = null) {
    try {
      const availableSlots = [];
      const today = moment().tz(this.timeZone);
      
      for (let day = 0; day <= daysAhead; day++) {
        const targetDate = today.clone().add(day, 'days');
        
        // Skip weekends
        if (targetDate.day() === 0 || targetDate.day() === 6) {
          continue;
        }
        
        // Skip excluded date if provided
        if (excludeDate && targetDate.format('YYYY-MM-DD') === moment(excludeDate).format('YYYY-MM-DD')) {
          continue;
        }
        
        const daySlots = await this.calendarService.findFreeSlots(duration, targetDate);
        
        // Filter slots within working hours
        const workingSlots = daySlots.filter(slot => {
          const slotStart = moment(slot.start).tz(this.timeZone);
          const workStart = targetDate.clone().hour(parseInt(this.workingHours.start.split(':')[0]))
                                           .minute(parseInt(this.workingHours.start.split(':')[1]));
          const workEnd = targetDate.clone().hour(parseInt(this.workingHours.end.split(':')[0]))
                                         .minute(parseInt(this.workingHours.end.split(':')[1]));
          
          return slotStart.isSameOrAfter(workStart) && slotStart.clone().add(duration, 'minutes').isSameOrBefore(workEnd);
        });
        
        availableSlots.push(...workingSlots.map(slot => ({
          ...slot,
          date: targetDate.format('YYYY-MM-DD'),
          dayOfWeek: targetDate.format('dddd')
        })));
      }
      
      return availableSlots.sort((a, b) => new Date(a.start) - new Date(b.start));
    } catch (error) {
      console.error('Error finding available slots:', error.message);
      throw error;
    }
  }

  async bookMeeting(meetingDetails) {
    try {
      // Validate meeting details
      const validation = this.validateMeetingDetails(meetingDetails);
      if (!validation.valid) {
        throw new Error(`Invalid meeting details: ${validation.errors.join(', ')}`);
      }

      // Check for conflicts
      const isAvailable = await this.calendarService.checkAvailability(
        meetingDetails.startTime,
        meetingDetails.endTime
      );

      if (!isAvailable) {
        const alternativeSlots = await this.suggestAlternativeSlots(meetingDetails);
        throw new Error(`Time slot not available. Suggested alternatives: ${JSON.stringify(alternativeSlots.slice(0, 3))}`);
      }

      // Validate working hours
      if (!this.isWithinWorkingHours(meetingDetails.startTime, meetingDetails.endTime)) {
        throw new Error('Meeting time is outside working hours');
      }

      // Check for buffer time with existing meetings
      const hasBuffer = await this.checkBufferTime(meetingDetails.startTime, meetingDetails.endTime);
      if (!hasBuffer) {
        console.warn('Warning: Meeting scheduled without recommended 15-minute buffer');
      }

      // Create the meeting
      const event = await this.calendarService.createEvent({
        title: meetingDetails.title,
        description: meetingDetails.description,
        startTime: meetingDetails.startTime,
        endTime: meetingDetails.endTime,
        attendees: meetingDetails.attendees || []
      });

      return {
        success: true,
        event: event,
        message: 'Meeting successfully booked'
      };
    } catch (error) {
      console.error('Error booking meeting:', error.message);
      return {
        success: false,
        error: error.message,
        suggestions: await this.suggestAlternativeSlots(meetingDetails)
      };
    }
  }

  validateMeetingDetails(details) {
    const errors = [];
    
    if (!details.title) {
      errors.push('Meeting title is required');
    }
    
    if (!details.startTime || !details.endTime) {
      errors.push('Start and end times are required');
    }
    
    if (details.startTime && details.endTime) {
      const start = moment(details.startTime);
      const end = moment(details.endTime);
      
      if (end.isSameOrBefore(start)) {
        errors.push('End time must be after start time');
      }
      
      if (end.diff(start, 'hours') > 4) {
        errors.push('Meetings longer than 4 hours are not recommended');
      }
      
      if (start.isBefore(moment())) {
        errors.push('Cannot book meetings in the past');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  isWithinWorkingHours(startTime, endTime) {
    const start = moment(startTime).tz(this.timeZone);
    const end = moment(endTime).tz(this.timeZone);
    
    const workStart = start.clone().hour(parseInt(this.workingHours.start.split(':')[0]))
                                  .minute(parseInt(this.workingHours.start.split(':')[1]));
    const workEnd = start.clone().hour(parseInt(this.workingHours.end.split(':')[0]))
                                .minute(parseInt(this.workingHours.end.split(':')[1]));
    
    // Check if entire meeting is within working hours
    return start.isSameOrAfter(workStart) && end.isSameOrBefore(workEnd);
  }

  async checkBufferTime(startTime, endTime, bufferMinutes = 15) {
    try {
      const start = moment(startTime);
      const end = moment(endTime);
      
      // Check for meetings before and after with buffer
      const beforeBufferStart = start.clone().subtract(bufferMinutes, 'minutes').toISOString();
      const afterBufferEnd = end.clone().add(bufferMinutes, 'minutes').toISOString();
      
      const conflictingEvents = await this.calendarService.getEvents(beforeBufferStart, afterBufferEnd);
      
      // Filter out the meeting we're checking for
      const actualConflicts = conflictingEvents.filter(event => {
        const eventStart = moment(event.start.dateTime || event.start.date);
        const eventEnd = moment(event.end.dateTime || event.end.date);
        
        // Check if there's overlap within buffer zone
        return (eventEnd.isAfter(start.clone().subtract(bufferMinutes, 'minutes')) && 
                eventStart.isBefore(end.clone().add(bufferMinutes, 'minutes'))) &&
               !(eventStart.isSame(start) && eventEnd.isSame(end));
      });
      
      return actualConflicts.length === 0;
    } catch (error) {
      console.error('Error checking buffer time:', error.message);
      return false;
    }
  }

  async suggestAlternativeSlots(originalMeeting) {
    try {
      const duration = moment(originalMeeting.endTime).diff(moment(originalMeeting.startTime), 'minutes');
      const preferredDate = moment(originalMeeting.startTime).format('YYYY-MM-DD');
      
      // First try same day
      let slots = await this.findAvailableSlots(duration, 0);
      
      // If no slots today, try next few days
      if (slots.length === 0) {
        slots = await this.findAvailableSlots(duration, 7);
      }
      
      // Return top 5 suggestions
      return slots.slice(0, 5).map(slot => ({
        start: slot.start,
        end: slot.end,
        date: slot.date,
        dayOfWeek: slot.dayOfWeek,
        startFormatted: moment(slot.start).tz(this.timeZone).format('MMMM Do, YYYY [at] h:mm A'),
        endFormatted: moment(slot.end).tz(this.timeZone).format('h:mm A')
      }));
    } catch (error) {
      console.error('Error suggesting alternative slots:', error.message);
      return [];
    }
  }

  async analyzeScheduleConflicts() {
    try {
      const upcomingEvents = await this.calendarService.getUpcomingEvents(7);
      const conflicts = [];
      
      for (let i = 0; i < upcomingEvents.length - 1; i++) {
        const currentEvent = upcomingEvents[i];
        const nextEvent = upcomingEvents[i + 1];
        
        const currentEnd = moment(currentEvent.end.dateTime || currentEvent.end.date);
        const nextStart = moment(nextEvent.start.dateTime || nextEvent.start.date);
        
        const timeBetween = nextStart.diff(currentEnd, 'minutes');
        
        if (timeBetween < 15) {
          conflicts.push({
            type: 'back-to-back',
            event1: this.calendarService.formatEventForSummary(currentEvent),
            event2: this.calendarService.formatEventForSummary(nextEvent),
            timeBetween: timeBetween,
            recommendation: timeBetween < 0 ? 'Overlapping meetings detected' : 'Consider adding buffer time'
          });
        }
        
        // Check for long meeting blocks
        const eventDuration = currentEnd.diff(moment(currentEvent.start.dateTime || currentEvent.start.date), 'hours');
        if (eventDuration > 2) {
          conflicts.push({
            type: 'long-meeting',
            event: this.calendarService.formatEventForSummary(currentEvent),
            duration: eventDuration,
            recommendation: 'Consider breaking into shorter sessions'
          });
        }
      }
      
      return conflicts;
    } catch (error) {
      console.error('Error analyzing schedule conflicts:', error.message);
      return [];
    }
  }

  async findOptimalMeetingTime(attendeeEmails, duration = 60, daysAhead = 7) {
    try {
      // This is a simplified version - in a real implementation, 
      // you'd need to check the calendars of all attendees
      const availableSlots = await this.findAvailableSlots(duration, daysAhead);
      
      // Prefer slots in the middle of the day (10 AM - 3 PM)
      const preferredSlots = availableSlots.filter(slot => {
        const hour = moment(slot.start).tz(this.timeZone).hour();
        return hour >= 10 && hour <= 15;
      });
      
      if (preferredSlots.length > 0) {
        return preferredSlots[0];
      }
      
      return availableSlots[0] || null;
    } catch (error) {
      console.error('Error finding optimal meeting time:', error.message);
      return null;
    }
  }
}

module.exports = MeetingService;