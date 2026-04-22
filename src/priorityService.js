const config = require('./config');
const AIService = require('./aiService');

class PriorityService {
  constructor() {
    this.aiService = new AIService();
    this.priorities = null;
    this.loadPriorities();
  }

  async loadPriorities() {
    try {
      this.priorities = await config.loadPriorities();
    } catch (error) {
      console.warn('Could not load priorities document:', error.message);
      this.priorities = null;
    }
  }

  async analyzeEmailPriority(email) {
    const factors = {
      priority: 'medium',
      score: 50,
      reasons: []
    };

    // Check subject line for priority keywords
    const subject = email.subject.toLowerCase();
    const from = email.from.toLowerCase();
    const body = email.body ? email.body.toLowerCase() : '';

    // High priority indicators
    if (this.containsHighPriorityKeywords(subject) || this.containsHighPriorityKeywords(body)) {
      factors.score += 30;
      factors.reasons.push('Contains high priority keywords');
    }

    // Urgent timing indicators
    if (subject.includes('urgent') || subject.includes('asap') || subject.includes('deadline')) {
      factors.score += 40;
      factors.reasons.push('Marked as urgent');
    }

    // Meeting/appointment related
    if (subject.includes('meeting') || subject.includes('interview') || subject.includes('call')) {
      factors.score += 20;
      factors.reasons.push('Meeting or appointment related');
    }

    // Client or external stakeholder
    if (from.includes('client') || !from.includes(this.getCompanyDomain())) {
      factors.score += 15;
      factors.reasons.push('External sender');
    }

    // Unread status
    if (email.isUnread) {
      factors.score += 10;
      factors.reasons.push('Unread email');
    }

    // Time sensitivity (emails from today are higher priority)
    const emailAge = Date.now() - email.timestamp;
    const hoursOld = emailAge / (1000 * 60 * 60);
    
    if (hoursOld < 2) {
      factors.score += 15;
      factors.reasons.push('Recent email');
    } else if (hoursOld > 24) {
      factors.score -= 10;
      factors.reasons.push('Older email');
    }

    // Low priority indicators
    if (this.containsLowPriorityKeywords(subject) || this.containsLowPriorityKeywords(body)) {
      factors.score -= 20;
      factors.reasons.push('Contains low priority keywords');
    }

    // Newsletter or promotional
    if (subject.includes('newsletter') || subject.includes('unsubscribe') || subject.includes('promotion')) {
      factors.score -= 25;
      factors.reasons.push('Newsletter or promotional content');
    }

    // Use AI analysis if available
    if (this.priorities) {
      try {
        const aiPriority = await this.aiService.analyzePriority(
          `${email.subject} ${email.body}`, 
          this.priorities
        );
        
        if (aiPriority === 'high') {
          factors.score += 20;
          factors.reasons.push('AI classified as high priority');
        } else if (aiPriority === 'low') {
          factors.score -= 15;
          factors.reasons.push('AI classified as low priority');
        }
      } catch (error) {
        console.warn('AI priority analysis failed:', error.message);
      }
    }

    // Determine final priority
    if (factors.score >= 75) {
      factors.priority = 'high';
    } else if (factors.score >= 40) {
      factors.priority = 'medium';
    } else {
      factors.priority = 'low';
    }

    return factors;
  }

  async analyzeCalendarEventPriority(event) {
    const factors = {
      priority: 'medium',
      score: 50,
      reasons: []
    };

    const title = event.title ? event.title.toLowerCase() : '';
    const description = event.description ? event.description.toLowerCase() : '';
    const attendees = event.attendees || [];

    // High priority meetings
    if (title.includes('1-on-1') || title.includes('one on one')) {
      factors.score += 30;
      factors.reasons.push('One-on-one meeting');
    }

    if (title.includes('interview') || title.includes('client')) {
      factors.score += 35;
      factors.reasons.push('Interview or client meeting');
    }

    if (title.includes('deadline') || title.includes('launch') || title.includes('review')) {
      factors.score += 25;
      factors.reasons.push('Deadline or milestone related');
    }

    // Meeting size considerations
    if (attendees.length <= 3) {
      factors.score += 15;
      factors.reasons.push('Small focused meeting');
    } else if (attendees.length > 10) {
      factors.score -= 10;
      factors.reasons.push('Large meeting (potentially less critical)');
    }

    // Time-based priority
    const eventTime = new Date(event.start);
    const now = new Date();
    const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);

    if (hoursUntilEvent <= 24 && hoursUntilEvent >= 0) {
      factors.score += 20;
      factors.reasons.push('Event is within 24 hours');
    }

    // Low priority indicators
    if (title.includes('optional') || title.includes('fyi') || title.includes('social')) {
      factors.score -= 25;
      factors.reasons.push('Optional or social event');
    }

    // Team meeting vs individual focus
    if (title.includes('team meeting') || title.includes('standup') || title.includes('all hands')) {
      factors.score -= 5;
      factors.reasons.push('Regular team meeting');
    }

    // Use AI analysis if available
    if (this.priorities) {
      try {
        const aiPriority = await this.aiService.analyzePriority(
          `${event.title} ${event.description}`, 
          this.priorities
        );
        
        if (aiPriority === 'high') {
          factors.score += 20;
          factors.reasons.push('AI classified as high priority');
        } else if (aiPriority === 'low') {
          factors.score -= 15;
          factors.reasons.push('AI classified as low priority');
        }
      } catch (error) {
        console.warn('AI priority analysis failed:', error.message);
      }
    }

    // Determine final priority
    if (factors.score >= 75) {
      factors.priority = 'high';
    } else if (factors.score >= 40) {
      factors.priority = 'medium';
    } else {
      factors.priority = 'low';
    }

    return factors;
  }

  containsHighPriorityKeywords(text) {
    const keywords = ['urgent', 'asap', 'deadline', 'critical', 'emergency', 'important', 'action required', 'time sensitive'];
    return keywords.some(keyword => text.includes(keyword));
  }

  containsLowPriorityKeywords(text) {
    const keywords = ['fyi', 'newsletter', 'social', 'promotional', 'optional', 'when convenient', 'no rush'];
    return keywords.some(keyword => text.includes(keyword));
  }

  getCompanyDomain() {
    // This should be configured based on user's company
    // For now, extract from notification email or use common domains
    const notificationEmail = config.get('notification.recipientEmail');
    if (notificationEmail && notificationEmail.includes('@')) {
      return notificationEmail.split('@')[1];
    }
    return 'company.com'; // fallback
  }

  formatPriorityReport(emails, events) {
    const report = {
      summary: {
        totalEmails: emails.length,
        totalEvents: events.length,
        highPriorityEmails: emails.filter(e => e.priority === 'high').length,
        highPriorityEvents: events.filter(e => e.priority === 'high').length
      },
      highPriorityEmails: emails.filter(e => e.priority === 'high').slice(0, 5),
      highPriorityEvents: events.filter(e => e.priority === 'high').slice(0, 5),
      mediumPriorityEmails: emails.filter(e => e.priority === 'medium').slice(0, 3),
      lowPriorityCount: emails.filter(e => e.priority === 'low').length
    };

    return report;
  }
}

module.exports = PriorityService;