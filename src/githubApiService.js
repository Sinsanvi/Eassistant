const axios = require('axios');
const config = require('./config');

class GitHubApiService {
  constructor() {
    this.baseUrl = 'https://api.github.com';
    this.owner = 'Sinsanvi'; // Repository owner
    this.repo = 'Eassistant'; // Repository name
    
    // GitHub token should be set as an environment variable or config
    this.token = process.env.GITHUB_TOKEN || config.get('github.token');
    
    if (!this.token) {
      console.warn('⚠️ GitHub token not found. Workflow triggering will not work.');
      console.warn('Set GITHUB_TOKEN environment variable or add github.token to config.');
    }
  }

  async triggerWorkflow(workflowId, inputs = {}) {
    try {
      if (!this.token) {
        throw new Error('GitHub token not configured');
      }

      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/dispatches`;
      
      console.log(`🚀 Triggering GitHub workflow: ${workflowId}`);
      console.log(`📝 Inputs:`, inputs);
      
      const response = await axios.post(url, {
        ref: 'main', // Branch to run the workflow on
        inputs: inputs
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'EAssistant/1.0'
        },
        timeout: 30000
      });

      if (response.status === 204) {
        console.log('✅ Workflow triggered successfully');
        return {
          success: true,
          message: 'Workflow triggered successfully',
          workflowId: workflowId,
          inputs: inputs
        };
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error triggering GitHub workflow:', error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      return {
        success: false,
        error: error.message,
        workflowId: workflowId,
        inputs: inputs
      };
    }
  }

  async triggerMeetingBooking(meetingDetails) {
    try {
      console.log('📅 Triggering meeting booking workflow via GitHub API');
      
      // Validate required fields
      if (!meetingDetails.date || !meetingDetails.time || !meetingDetails.attendees) {
        throw new Error('Missing required meeting details: date, time, or attendees');
      }

      const workflowInputs = {
        meeting_title: meetingDetails.title || 'Automated Meeting',
        meeting_date: meetingDetails.date,
        meeting_time: meetingDetails.time,
        attendees: meetingDetails.attendees,
        duration: meetingDetails.duration || '60',
        send_confirmation: 'true'
      };

      const result = await this.triggerWorkflow('book-meeting.yml', workflowInputs);
      
      if (result.success) {
        console.log('🎉 Meeting booking workflow triggered successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error triggering meeting booking:', error.message);
      return {
        success: false,
        error: error.message,
        meetingDetails: meetingDetails
      };
    }
  }

  async triggerSlotFinding(duration = '60', days = '7', timezone = 'America/New_York') {
    try {
      console.log('🔍 Triggering slot finding workflow via GitHub API');
      
      const workflowInputs = {
        duration: duration.toString(),
        days: days.toString(),
        timezone: timezone
      };

      const result = await this.triggerWorkflow('find-slots.yml', workflowInputs);
      
      if (result.success) {
        console.log('🕐 Slot finding workflow triggered successfully');
      }
      
      return result;
    } catch (error) {
      console.error('Error triggering slot finding:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getWorkflowRuns(workflowId, limit = 5) {
    try {
      if (!this.token) {
        throw new Error('GitHub token not configured');
      }

      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/runs`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EAssistant/1.0'
        },
        params: {
          per_page: limit,
          status: 'completed'
        },
        timeout: 15000
      });

      const runs = response.data.workflow_runs || [];
      
      return {
        success: true,
        runs: runs.map(run => ({
          id: run.id,
          status: run.status,
          conclusion: run.conclusion,
          created_at: run.created_at,
          updated_at: run.updated_at,
          html_url: run.html_url,
          head_branch: run.head_branch
        }))
      };
    } catch (error) {
      console.error('Error fetching workflow runs:', error.message);
      return {
        success: false,
        error: error.message,
        runs: []
      };
    }
  }

  async getRepositoryInfo() {
    try {
      const url = `${this.baseUrl}/repos/${this.owner}/${this.repo}`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'EAssistant/1.0'
        },
        timeout: 15000
      });

      return {
        success: true,
        repository: {
          name: response.data.name,
          full_name: response.data.full_name,
          html_url: response.data.html_url,
          default_branch: response.data.default_branch,
          has_actions: response.data.has_actions || false
        }
      };
    } catch (error) {
      console.error('Error fetching repository info:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testConnection() {
    try {
      console.log('🔧 Testing GitHub API connection...');
      
      // Test with public repository info first (no token required)
      const repoInfo = await this.getRepositoryInfo();
      
      if (!repoInfo.success) {
        return {
          success: false,
          error: 'Cannot access repository',
          details: repoInfo.error
        };
      }

      console.log(`✅ Repository accessible: ${repoInfo.repository.full_name}`);
      
      // Test authenticated access if token is available
      if (this.token) {
        const workflowRuns = await this.getWorkflowRuns('eassistant.yml', 1);
        
        if (workflowRuns.success) {
          console.log('✅ GitHub API authentication successful');
          return {
            success: true,
            message: 'GitHub API connection and authentication successful',
            repository: repoInfo.repository,
            canTriggerWorkflows: true
          };
        } else {
          console.log('⚠️ Repository accessible but workflow access limited');
          return {
            success: true,
            message: 'Repository accessible but limited workflow access',
            repository: repoInfo.repository,
            canTriggerWorkflows: false,
            warning: 'Check GitHub token permissions'
          };
        }
      } else {
        console.log('⚠️ No GitHub token configured');
        return {
          success: true,
          message: 'Repository accessible but no authentication token',
          repository: repoInfo.repository,
          canTriggerWorkflows: false,
          warning: 'Set GITHUB_TOKEN environment variable to enable workflow triggering'
        };
      }
    } catch (error) {
      console.error('❌ GitHub API test failed:', error.message);
      return {
        success: false,
        error: error.message,
        canTriggerWorkflows: false
      };
    }
  }

  generateGitHubTokenInstructions() {
    return {
      title: 'How to Generate GitHub Personal Access Token',
      steps: [
        '1. Go to GitHub.com → Settings → Developer settings → Personal access tokens → Tokens (classic)',
        '2. Click "Generate new token" → "Generate new token (classic)"',
        '3. Give it a descriptive name: "EAssistant Workflow Trigger"',
        '4. Set expiration (recommend 90 days for security)',
        '5. Select these scopes:',
        '   ✅ repo (Full control of private repositories)',
        '   ✅ workflow (Update GitHub Action workflows)',
        '6. Click "Generate token"',
        '7. Copy the token immediately (you won\'t see it again!)',
        '8. Add to your .env file: GITHUB_TOKEN=ghp_your_token_here',
        '9. Or add to GitHub repository secrets as GITHUB_TOKEN'
      ],
      important: [
        '⚠️ Keep your token secure - treat it like a password',
        '⚠️ Never commit tokens to your repository',
        '⚠️ Set reasonable expiration dates for security'
      ]
    };
  }
}

module.exports = GitHubApiService;