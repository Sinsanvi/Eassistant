const { google } = require('googleapis');
const moment = require('moment');
const config = require('./config');

class GoogleCalendarService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.get('google.clientId'),
      config.get('google.clientSecret'),
      config.get('google.redirectUri')
    );

    this.oauth2Client.setCredentials({
      refresh_token: config.get('google.refreshToken')
    });

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
  }

  async getEvents(timeMin = moment().startOf('day').toISOString(), timeMax = moment().add(7, 'days').toISOString()) {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error.message);
      throw error;
    }
  }

  async getTodaysEvents() {
    const timeMin = moment().startOf('day').toISOString();
    const timeMax = moment().endOf('day').toISOString();
    return this.getEvents(timeMin, timeMax);
  }

  async getUpcomingEvents(days = 7) {
    const timeMin = moment().toISOString();
    const timeMax = moment().add(days, 'days').toISOString();
    return this.getEvents(timeMin, timeMax);
  }

  async findFreeSlots(duration = 60, date = moment()) {
    const dayStart = date.clone().hour(9).minute(0).second(0);
    const dayEnd = date.clone().hour(17).minute(0).second(0);
    
    const events = await this.getEvents(
      dayStart.toISOString(),
      dayEnd.toISOString()
    );

    const freeSlots = [];
    let currentTime = dayStart.clone();

    // Skip lunch time (12 PM - 1 PM)
    const lunchStart = date.clone().hour(12).minute(0);
    const lunchEnd = date.clone().hour(13).minute(0);

    while (currentTime.clone().add(duration, 'minutes').isSameOrBefore(dayEnd)) {
      // Skip lunch time
      if (currentTime.isSameOrAfter(lunchStart) && currentTime.isBefore(lunchEnd)) {
        currentTime = lunchEnd.clone();
        continue;
      }

      const slotEnd = currentTime.clone().add(duration, 'minutes');
      let isSlotFree = true;

      // Check if this slot conflicts with any existing events
      for (const event of events) {
        if (!event.start || !event.end) continue;

        const eventStart = moment(event.start.dateTime || event.start.date);
        const eventEnd = moment(event.end.dateTime || event.end.date);

        // Check for overlap
        if (currentTime.isBefore(eventEnd) && slotEnd.isAfter(eventStart)) {
          isSlotFree = false;
          // Jump to the end of this event
          currentTime = eventEnd.clone();
          break;
        }
      }

      if (isSlotFree) {
        freeSlots.push({
          start: currentTime.toISOString(),
          end: slotEnd.toISOString(),
          duration: duration
        });
        currentTime.add(15, 'minutes'); // 15-minute buffer between meetings
      }
    }

    return freeSlots;
  }

  async createEvent(eventData) {
    try {
      const event = {
        summary: eventData.title,
        description: eventData.description || '',
        start: {
          dateTime: eventData.startTime,
          timeZone: config.get('scheduling.timeZone'),
        },
        end: {
          dateTime: eventData.endTime,
          timeZone: config.get('scheduling.timeZone'),
        },
        attendees: eventData.attendees || [],
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 10 },
          ],
        },
      };

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error creating calendar event:', error.message);
      throw error;
    }
  }

  async checkAvailability(startTime, endTime) {
    const events = await this.getEvents(startTime, endTime);
    
    const startMoment = moment(startTime);
    const endMoment = moment(endTime);

    // Check if the time slot conflicts with existing events
    for (const event of events) {
      if (!event.start || !event.end) continue;

      const eventStart = moment(event.start.dateTime || event.start.date);
      const eventEnd = moment(event.end.dateTime || event.end.date);

      // Check for overlap
      if (startMoment.isBefore(eventEnd) && endMoment.isAfter(eventStart)) {
        return false; // Conflict found
      }
    }

    return true; // No conflicts
  }

  formatEventForSummary(event) {
    const start = event.start.dateTime || event.start.date;
    const end = event.end.dateTime || event.end.date;
    
    return {
      title: event.summary || 'No title',
      start: moment(start).format('YYYY-MM-DD HH:mm'),
      end: moment(end).format('YYYY-MM-DD HH:mm'),
      description: event.description || '',
      attendees: event.attendees ? event.attendees.map(a => a.email) : [],
      location: event.location || '',
      status: event.status
    };
  }
}

module.exports = GoogleCalendarService;