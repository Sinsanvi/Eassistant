const moment = require('moment-timezone');
const config = require('./config');

class EmailParser {
  constructor() {
    this.timeZone = config.get('scheduling.timeZone') || 'America/New_York';
    
    // Keywords that indicate meeting booking requests
    this.meetingKeywords = [
      'book meeting', 'schedule meeting', 'arrange meeting', 'set up meeting',
      'book a meeting', 'schedule a meeting', 'create meeting', 'meeting request',
      'can we meet', 'lets meet', 'book time', 'schedule time'
    ];
    
    // Time patterns to extract from text
    this.timePatterns = [
      // Tomorrow at 2pm, tomorrow 2pm, tomorrow at 14:00
      /tomorrow\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/gi,
      /tomorrow\s+(?:at\s+)?(\d{1,2}:\d{2})/gi,
      
      // Monday at 3pm, tuesday 10am, etc.
      /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/gi,
      
      // Specific dates: April 26 at 2pm, 4/26 at 2pm, 2026-04-26 at 14:00
      /((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/gi,
      
      // Time ranges: 2pm-3pm, 14:00-15:00
      /(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)\s*[-to]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/gi,
      
      // Just times: 2pm, 14:00, 10:30am
      /\b(\d{1,2}:\d{2})\b/gi,
      /\b(\d{1,2}\s*(?:am|pm|AM|PM))\b/gi
    ];
    
    // Duration patterns
    this.durationPatterns = [
      /(\d+)\s*(?:hour|hr|hours|hrs)/gi,
      /(\d+)\s*(?:minute|min|minutes|mins)/gi,
      /(\d+)\s*h\b/gi,
      /(\d+)\s*m\b/gi
    ];
    
    // Email extraction pattern
    this.emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi;
  }

  parseMeetingRequest(emailSubject, emailBody, senderEmail) {
    try {
      const fullText = `${emailSubject} ${emailBody}`.toLowerCase();
      
      // Check if this is a meeting request
      if (!this.isMeetingRequest(fullText)) {
        return null;
      }

      console.log('📧 Parsing meeting request from:', senderEmail);
      
      // Extract meeting details
      const meetingDetails = {
        detectedAt: moment().toISOString(),
        senderEmail: senderEmail,
        rawSubject: emailSubject,
        rawBody: emailBody,
        title: this.extractMeetingTitle(emailSubject, emailBody),
        attendees: this.extractAttendees(emailBody, senderEmail),
        dateTime: this.extractDateTime(fullText),
        duration: this.extractDuration(fullText),
        confidence: 0
      };

      // Calculate confidence score
      meetingDetails.confidence = this.calculateConfidence(meetingDetails, fullText);
      
      return meetingDetails;
    } catch (error) {
      console.error('Error parsing meeting request:', error.message);
      return null;
    }
  }

  isMeetingRequest(text) {
    return this.meetingKeywords.some(keyword => 
      text.includes(keyword)
    ) || text.includes('meeting') && (
      text.includes('book') || 
      text.includes('schedule') || 
      text.includes('arrange') ||
      text.includes('set up') ||
      text.includes('plan')
    );
  }

  extractMeetingTitle(subject, body) {
    // Try to extract meaningful title from subject or body
    const cleanSubject = subject.replace(/^(re:|fwd?:|meeting:?|schedule:?)/gi, '').trim();
    
    if (cleanSubject && cleanSubject.length > 3 && cleanSubject.length < 100) {
      return cleanSubject;
    }
    
    // Look for quoted meeting titles in body
    const quotedTitle = body.match(/"([^"]{3,50})"/);
    if (quotedTitle) {
      return quotedTitle[1];
    }
    
    // Default based on sender
    return 'Meeting Request';
  }

  extractAttendees(text, senderEmail) {
    const emails = [];
    const matches = text.match(this.emailPattern) || [];
    
    for (const email of matches) {
      const cleanEmail = email.toLowerCase().trim();
      // Don't include the sender's email as an attendee
      if (cleanEmail !== senderEmail.toLowerCase() && 
          !emails.includes(cleanEmail) &&
          this.isValidEmail(cleanEmail)) {
        emails.push(cleanEmail);
      }
    }
    
    // Always include the sender as an attendee
    if (this.isValidEmail(senderEmail) && !emails.includes(senderEmail.toLowerCase())) {
      emails.push(senderEmail.toLowerCase());
    }
    
    return emails;
  }

  extractDateTime(text) {
    const now = moment().tz(this.timeZone);
    
    // Try to find tomorrow references
    const tomorrowMatch = text.match(/tomorrow\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)(?:\s+est|et|pst|pt|cst|ct|mst|mt)?)/i);
    if (tomorrowMatch) {
      const time = this.parseTime(tomorrowMatch[1]);
      if (time) {
        const tomorrow = now.clone().add(1, 'day').hour(time.hour).minute(time.minute || 0);
        return {
          date: tomorrow.format('YYYY-MM-DD'),
          time: tomorrow.format('HH:mm'),
          dateTime: tomorrow.toISOString(),
          source: 'tomorrow',
          confidence: 0.9
        };
      }
    }
    
    // Try to find day of week
    const dayMatch = text.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (dayMatch) {
      const dayName = dayMatch[1].toLowerCase();
      const timeStr = dayMatch[2];
      const time = this.parseTime(timeStr);
      
      if (time) {
        const targetDay = this.getNextDayOfWeek(dayName);
        const meetingTime = targetDay.hour(time.hour).minute(time.minute || 0);
        
        return {
          date: meetingTime.format('YYYY-MM-DD'),
          time: meetingTime.format('HH:mm'),
          dateTime: meetingTime.toISOString(),
          source: 'day_of_week',
          confidence: 0.8
        };
      }
    }
    
    // Try to find specific dates
    const dateMatch = text.match(/((?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\s+(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const timeStr = dateMatch[2];
      const time = this.parseTime(timeStr);
      const date = this.parseDate(dateStr);
      
      if (time && date) {
        const meetingTime = date.hour(time.hour).minute(time.minute || 0);
        return {
          date: meetingTime.format('YYYY-MM-DD'),
          time: meetingTime.format('HH:mm'),
          dateTime: meetingTime.toISOString(),
          source: 'specific_date',
          confidence: 0.95
        };
      }
    }
    
    // Look for just times (assume today if time is in future, tomorrow if past)
    const timeOnlyMatch = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm)|\d{1,2}:\d{2})\b/i);
    if (timeOnlyMatch) {
      const time = this.parseTime(timeOnlyMatch[1]);
      if (time) {
        let targetDate = now.clone().hour(time.hour).minute(time.minute || 0);
        
        // If time has passed today, assume tomorrow
        if (targetDate.isBefore(now)) {
          targetDate.add(1, 'day');
        }
        
        return {
          date: targetDate.format('YYYY-MM-DD'),
          time: targetDate.format('HH:mm'),
          dateTime: targetDate.toISOString(),
          source: 'time_only',
          confidence: 0.6
        };
      }
    }
    
    return null;
  }

  parseTime(timeStr) {
    if (!timeStr) return null;
    
    const cleanTime = timeStr.trim().toLowerCase();
    
    // Handle 12-hour format (with optional timezone)
    const ampmMatch = cleanTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)(?:\s+est|et|pst|pt|cst|ct|mst|mt)?/);
    if (ampmMatch) {
      let hour = parseInt(ampmMatch[1]);
      const minute = parseInt(ampmMatch[2]) || 0;
      const ampm = ampmMatch[3];
      
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      return { hour, minute };
    }
    
    // Handle 24-hour format
    const timeMatch = cleanTime.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      return {
        hour: parseInt(timeMatch[1]),
        minute: parseInt(timeMatch[2])
      };
    }
    
    // Handle hour only
    const hourMatch = cleanTime.match(/^(\d{1,2})$/);
    if (hourMatch) {
      const hour = parseInt(hourMatch[1]);
      // Assume PM for business hours 8-12, AM for 1-7
      if (hour >= 8 && hour <= 12) {
        return { hour, minute: 0 };
      } else if (hour >= 1 && hour <= 7) {
        return { hour: hour + 12, minute: 0 };
      }
    }
    
    return null;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    const now = moment().tz(this.timeZone);
    
    // Handle month/day format (e.g., "April 26", "4/26")
    if (dateStr.match(/\d{1,2}\/\d{1,2}/)) {
      const [month, day] = dateStr.split('/').map(Number);
      return now.clone().month(month - 1).date(day);
    }
    
    // Handle ISO format (e.g., "2026-04-26")
    if (dateStr.match(/\d{4}-\d{2}-\d{2}/)) {
      return moment.tz(dateStr, this.timeZone);
    }
    
    // Handle month name format (e.g., "April 26")
    const monthMatch = dateStr.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
    if (monthMatch) {
      const monthName = monthMatch[1].toLowerCase();
      const day = parseInt(monthMatch[2]);
      const monthIndex = moment().month(monthName).month();
      return now.clone().month(monthIndex).date(day);
    }
    
    return null;
  }

  getNextDayOfWeek(dayName) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(dayName.toLowerCase());
    const today = moment().tz(this.timeZone);
    const currentDay = today.day();
    
    let daysToAdd = targetDay - currentDay;
    if (daysToAdd <= 0) {
      daysToAdd += 7; // Next week
    }
    
    return today.clone().add(daysToAdd, 'days');
  }

  extractDuration(text) {
    // Look for explicit duration mentions
    let duration = 60; // default
    
    const hourMatch = text.match(/(\d+)\s*(?:hour|hr|hours|hrs)/i);
    if (hourMatch) {
      duration = parseInt(hourMatch[1]) * 60;
    }
    
    const minuteMatch = text.match(/(\d+)\s*(?:minute|min|minutes|mins)/i);
    if (minuteMatch) {
      duration = parseInt(minuteMatch[1]);
    }
    
    // Look for time ranges
    const rangeMatch = text.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-to]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    if (rangeMatch) {
      const startTime = this.parseTime(rangeMatch[1]);
      const endTime = this.parseTime(rangeMatch[2]);
      
      if (startTime && endTime) {
        const startMinutes = startTime.hour * 60 + startTime.minute;
        const endMinutes = endTime.hour * 60 + endTime.minute;
        duration = endMinutes - startMinutes;
        
        if (duration <= 0) duration += 24 * 60; // Next day
      }
    }
    
    return Math.max(15, Math.min(duration, 480)); // Between 15 minutes and 8 hours
  }

  calculateConfidence(meetingDetails, text) {
    let confidence = 0;
    
    // Base confidence for detecting a meeting request
    confidence += 0.3;
    
    // DateTime confidence
    if (meetingDetails.dateTime) {
      confidence += meetingDetails.dateTime.confidence || 0.3;
    }
    
    // Attendees confidence
    if (meetingDetails.attendees.length > 1) {
      confidence += 0.2;
    }
    
    // Subject line relevance
    if (meetingDetails.rawSubject && meetingDetails.rawSubject.toLowerCase().includes('meeting')) {
      confidence += 0.1;
    }
    
    // Specific meeting keywords
    const specificKeywords = ['book', 'schedule', 'arrange', 'set up'];
    if (specificKeywords.some(keyword => text.includes(keyword))) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 1.0);
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  formatParsedMeeting(parsed) {
    if (!parsed || parsed.confidence < 0.5) {
      return null;
    }

    return {
      title: parsed.title,
      date: parsed.dateTime?.date,
      time: parsed.dateTime?.time,
      attendees: parsed.attendees.join(','),
      duration: parsed.duration.toString(),
      senderEmail: parsed.senderEmail,
      confidence: parsed.confidence,
      source: parsed.dateTime?.source || 'unknown'
    };
  }
}

module.exports = EmailParser;