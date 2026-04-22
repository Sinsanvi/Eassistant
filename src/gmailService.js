const { google } = require('googleapis');
const moment = require('moment');
const config = require('./config');

class GmailService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.get('google.clientId'),
      config.get('google.clientSecret'),
      config.get('google.redirectUri')
    );

    this.oauth2Client.setCredentials({
      refresh_token: config.get('google.refreshToken')
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  async getRecentEmails(hoursBack = 12, maxResults = 50) {
    try {
      const since = moment().subtract(hoursBack, 'hours').unix();
      
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: `after:${since} -in:spam -in:trash`,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      const emailDetails = [];

      for (const message of messages) {
        try {
          const details = await this.getEmailDetails(message.id);
          emailDetails.push(details);
        } catch (error) {
          console.warn(`Error fetching email ${message.id}:`, error.message);
        }
      }

      return emailDetails;
    } catch (error) {
      console.error('Error fetching emails:', error.message);
      throw error;
    }
  }

  async getEmailDetails(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      });

      const message = response.data;
      const headers = message.payload.headers;

      const getHeader = (name) => {
        const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
        return header ? header.value : '';
      };

      const body = this.extractEmailBody(message.payload);

      return {
        id: message.id,
        threadId: message.threadId,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        body: body,
        snippet: message.snippet,
        labelIds: message.labelIds || [],
        isUnread: message.labelIds ? message.labelIds.includes('UNREAD') : false,
        timestamp: parseInt(message.internalDate)
      };
    } catch (error) {
      console.error(`Error getting email details for ${messageId}:`, error.message);
      throw error;
    }
  }

  extractEmailBody(payload) {
    let body = '';

    if (payload.body && payload.body.data) {
      body = Buffer.from(payload.body.data, 'base64').toString();
    } else if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          body += Buffer.from(part.body.data, 'base64').toString();
        } else if (part.parts) {
          // Recursively check nested parts
          body += this.extractEmailBody(part);
        }
      }
    }

    return body;
  }

  async markAsRead(messageId) {
    try {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        resource: {
          removeLabelIds: ['UNREAD']
        }
      });
    } catch (error) {
      console.error(`Error marking email ${messageId} as read:`, error.message);
    }
  }

  async getUnreadEmails() {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread -in:spam -in:trash',
        maxResults: 100
      });

      const messages = response.data.messages || [];
      const emailDetails = [];

      for (const message of messages) {
        try {
          const details = await this.getEmailDetails(message.id);
          emailDetails.push(details);
        } catch (error) {
          console.warn(`Error fetching unread email ${message.id}:`, error.message);
        }
      }

      return emailDetails;
    } catch (error) {
      console.error('Error fetching unread emails:', error.message);
      throw error;
    }
  }

  async searchEmails(query, maxResults = 20) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults
      });

      const messages = response.data.messages || [];
      const emailDetails = [];

      for (const message of messages) {
        try {
          const details = await this.getEmailDetails(message.id);
          emailDetails.push(details);
        } catch (error) {
          console.warn(`Error fetching email ${message.id}:`, error.message);
        }
      }

      return emailDetails;
    } catch (error) {
      console.error('Error searching emails:', error.message);
      throw error;
    }
  }

  formatEmailForSummary(email) {
    return {
      subject: email.subject,
      from: email.from,
      date: moment(parseInt(email.timestamp)).format('YYYY-MM-DD HH:mm'),
      snippet: email.snippet,
      isUnread: email.isUnread,
      body: email.body.substring(0, 500) + (email.body.length > 500 ? '...' : '')
    };
  }

  async getUserProfile() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting user profile:', error.message);
      throw error;
    }
  }
}

module.exports = GmailService;