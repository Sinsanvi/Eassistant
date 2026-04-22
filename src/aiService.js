const axios = require('axios');
const config = require('./config');

class AIService {
  constructor() {
    this.provider = config.get('ai.provider');
    this.apiKey = config.get('ai.apiKey');
    this.model = config.get('ai.model');
  }

  async summarizeContent(content, type = 'mixed') {
    try {
      let prompt = '';
      
      switch (type) {
        case 'emails':
          prompt = `Analyze these emails and provide a concise summary with priorities:

${content}

Please provide:
1. High priority emails that need immediate attention
2. Medium priority emails for review
3. Low priority emails (FYI, newsletters, etc.)
4. Key action items or deadlines mentioned
5. Important people or meetings mentioned

Keep the summary under 300 words.`;
          break;
          
        case 'calendar':
          prompt = `Analyze these calendar events and provide a summary:

${content}

Please provide:
1. Today's key meetings and their importance
2. Upcoming important deadlines or events
3. Potential scheduling conflicts
4. Recommended preparation for important meetings
5. Available time slots for new meetings

Keep the summary under 200 words.`;
          break;
          
        default:
          prompt = `Analyze this email and calendar data and create a daily priority summary:

${content}

Please provide:
1. Top 3 priorities for today
2. Important meetings and their context
3. Urgent emails requiring response
4. Upcoming deadlines this week
5. Recommended time blocks for focused work

Keep the summary actionable and under 400 words.`;
      }

      return await this.callAI(prompt);
    } catch (error) {
      console.error('Error in AI summarization:', error.message);
      return this.getFallbackSummary(content, type);
    }
  }

  async callAI(prompt) {
    try {
      // Using Hugging Face Inference API (free tier)
      if (this.provider === 'huggingface') {
        return await this.callHuggingFace(prompt);
      }
      
      // Fallback to local summarization
      return this.getFallbackSummary(prompt, 'mixed');
    } catch (error) {
      console.error('AI API call failed:', error.message);
      return this.getFallbackSummary(prompt, 'mixed');
    }
  }

  async callHuggingFace(prompt) {
    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
        {
          inputs: prompt,
          parameters: {
            max_length: 300,
            min_length: 50,
            do_sample: false
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data[0] && response.data[0].summary_text) {
        return response.data[0].summary_text;
      }
      
      throw new Error('Invalid response format from Hugging Face API');
    } catch (error) {
      console.error('Hugging Face API error:', error.message);
      throw error;
    }
  }

  getFallbackSummary(content, type) {
    // Basic rule-based summarization when AI is not available
    const lines = content.split('\n').filter(line => line.trim());
    const wordCount = content.split(' ').length;
    
    let summary = '📋 **Daily Summary** (Generated locally)\n\n';
    
    if (type === 'emails') {
      const urgentKeywords = ['urgent', 'asap', 'deadline', 'meeting', 'interview'];
      const urgentLines = lines.filter(line => 
        urgentKeywords.some(keyword => line.toLowerCase().includes(keyword))
      );
      
      summary += '🔴 **High Priority:**\n';
      if (urgentLines.length > 0) {
        summary += urgentLines.slice(0, 3).map(line => `• ${line.substring(0, 100)}...`).join('\n');
      } else {
        summary += '• No urgent emails identified\n';
      }
      
      summary += '\n📧 **Email Count:** ' + Math.ceil(wordCount / 200) + ' emails processed\n';
    }
    
    if (type === 'calendar') {
      summary += '📅 **Today\'s Schedule:**\n';
      const timeLines = lines.filter(line => line.includes(':') && (line.includes('AM') || line.includes('PM') || line.includes('2024')));
      
      if (timeLines.length > 0) {
        summary += timeLines.slice(0, 5).map(line => `• ${line}`).join('\n');
      } else {
        summary += '• No specific time-based events found\n';
      }
    }
    
    summary += '\n⚡ **Quick Actions Needed:**\n';
    summary += '• Review high-priority items above\n';
    summary += '• Check calendar for conflicts\n';
    summary += '• Prepare for upcoming meetings\n';
    
    summary += '\n💡 *AI summarization temporarily unavailable - using fallback analysis*';
    
    return summary;
  }

  async analyzePriority(text, priorities) {
    try {
      if (!priorities) return 'medium';
      
      const lowercaseText = text.toLowerCase();
      const lowercasePriorities = priorities.toLowerCase();
      
      // Extract keywords from priorities document
      const highKeywords = this.extractKeywords(lowercasePriorities, 'high priority');
      const mediumKeywords = this.extractKeywords(lowercasePriorities, 'medium priority');
      const lowKeywords = this.extractKeywords(lowercasePriorities, 'low priority');
      
      // Check for high priority keywords
      if (highKeywords.some(keyword => lowercaseText.includes(keyword))) {
        return 'high';
      }
      
      // Check for low priority keywords
      if (lowKeywords.some(keyword => lowercaseText.includes(keyword))) {
        return 'low';
      }
      
      // Default to medium priority
      return 'medium';
    } catch (error) {
      console.error('Error analyzing priority:', error.message);
      return 'medium';
    }
  }

  extractKeywords(text, section) {
    try {
      const sectionIndex = text.indexOf(section.toLowerCase());
      if (sectionIndex === -1) return [];
      
      const nextSectionIndex = text.indexOf('##', sectionIndex + 1);
      const sectionText = nextSectionIndex === -1 
        ? text.substring(sectionIndex) 
        : text.substring(sectionIndex, nextSectionIndex);
      
      // Extract words that look like keywords (not common words)
      const words = sectionText.match(/\b\w+\b/g) || [];
      const keywords = words.filter(word => 
        word.length > 2 && 
        !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'doesn', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word.toLowerCase())
      );
      
      return keywords;
    } catch (error) {
      console.error('Error extracting keywords:', error.message);
      return [];
    }
  }
}

module.exports = AIService;