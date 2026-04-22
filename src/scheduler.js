const cron = require('node-cron');
const EAssistant = require('./index');
const config = require('./config');
const moment = require('moment');

class Scheduler {
  constructor() {
    this.assistant = new EAssistant();
    this.jobs = [];
    this.summaryTimes = config.get('scheduling.summaryTimes') || ['08:00', '17:00'];
    this.timeZone = config.get('scheduling.timeZone') || 'America/New_York';
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🕐 Starting EAssistant Scheduler...');
    console.log(`📅 Summary times: ${this.summaryTimes.join(', ')}`);
    console.log(`🌍 Timezone: ${this.timeZone}`);

    // Schedule summaries for each configured time
    this.summaryTimes.forEach((time, index) => {
      const [hour, minute] = time.split(':').map(Number);
      const cronExpression = `${minute} ${hour} * * *`; // Daily at specified time
      
      console.log(`⏰ Scheduling summary #${index + 1} at ${time} (${cronExpression})`);
      
      const job = cron.schedule(cronExpression, async () => {
        console.log(`\n🚀 Executing scheduled summary at ${moment().format('YYYY-MM-DD HH:mm:ss')}`);
        await this.runSummary(`scheduled-${time}`);
      }, {
        scheduled: false,
        timezone: this.timeZone
      });

      this.jobs.push({
        time: time,
        job: job,
        cronExpression: cronExpression
      });
    });

    // Start all jobs
    this.jobs.forEach(({ job }) => job.start());
    this.isRunning = true;

    console.log(`✅ Scheduler started with ${this.jobs.length} jobs`);
    console.log('📝 Next scheduled runs:');
    this.printNextRuns();
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('⏹️ Stopping scheduler...');
    this.jobs.forEach(({ job }) => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('✅ Scheduler stopped');
  }

  async runSummary(source = 'manual') {
    const startTime = Date.now();
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🤖 EASSISTANT SUMMARY EXECUTION`);
    console.log(`📅 Time: ${timestamp}`);
    console.log(`🔄 Source: ${source}`);
    console.log(`${'='.repeat(50)}`);

    try {
      const result = await this.assistant.generateSummary();
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log('✅ Summary completed successfully');
        console.log(`📊 Stats: ${result.summary.emailsProcessed} emails, ${result.summary.eventsAnalyzed} events`);
        console.log(`⏱️ Processing time: ${duration}ms`);
        console.log(`📧 Email delivery: ${result.emailDelivery.success ? 'Sent' : 'Failed'}`);
        
        if (result.summary.highPriorityEmails > 0 || result.summary.highPriorityEvents > 0) {
          console.log(`🔴 High priority items: ${result.summary.highPriorityEmails} emails, ${result.summary.highPriorityEvents} events`);
        }
        
        if (result.summary.conflictsFound > 0) {
          console.log(`⚠️ Schedule conflicts detected: ${result.summary.conflictsFound}`);
        }
      } else {
        console.error('❌ Summary failed:', result.error);
      }

      // Log result to file for monitoring
      await this.logResult(result, source, timestamp);

      return result;
    } catch (error) {
      console.error('💥 Critical error during summary execution:', error.message);
      const errorResult = {
        success: false,
        error: error.message,
        timestamp: timestamp,
        source: source
      };
      
      await this.logResult(errorResult, source, timestamp);
      return errorResult;
    }
  }

  async logResult(result, source, timestamp) {
    try {
      const fs = require('fs-extra');
      const path = require('path');
      
      const logsDir = path.join(process.cwd(), 'logs');
      await fs.ensureDir(logsDir);
      
      const logFile = path.join(logsDir, `eassistant-${moment().format('YYYY-MM')}.log`);
      const logEntry = {
        timestamp: timestamp,
        source: source,
        success: result.success,
        summary: result.summary || null,
        error: result.error || null,
        processingTime: result.processingTime || null
      };
      
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('⚠️ Failed to write log:', error.message);
    }
  }

  printNextRuns() {
    const now = moment().tz(this.timeZone);
    
    this.summaryTimes.forEach(time => {
      const [hour, minute] = time.split(':').map(Number);
      let nextRun = now.clone().hour(hour).minute(minute).second(0);
      
      if (nextRun.isSameOrBefore(now)) {
        nextRun.add(1, 'day');
      }
      
      console.log(`  📍 ${time} → ${nextRun.format('MMM Do, YYYY [at] h:mm A')}`);
    });
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      summaryTimes: this.summaryTimes,
      timeZone: this.timeZone,
      nextRuns: this.jobs.map(({ time }) => {
        const [hour, minute] = time.split(':').map(Number);
        const now = moment().tz(this.timeZone);
        let nextRun = now.clone().hour(hour).minute(minute).second(0);
        
        if (nextRun.isSameOrBefore(now)) {
          nextRun.add(1, 'day');
        }
        
        return {
          time: time,
          nextRun: nextRun.toISOString(),
          nextRunFormatted: nextRun.format('MMM Do, YYYY [at] h:mm A')
        };
      })
    };
  }

  // Add a one-time scheduled run
  scheduleOneTime(dateTime, description = 'One-time run') {
    const targetMoment = moment(dateTime).tz(this.timeZone);
    
    if (targetMoment.isSameOrBefore(moment())) {
      throw new Error('Cannot schedule in the past');
    }
    
    const cronExpression = `${targetMoment.minute()} ${targetMoment.hour()} ${targetMoment.date()} ${targetMoment.month() + 1} *`;
    
    console.log(`⏰ Scheduling one-time run: ${description} at ${targetMoment.format('MMM Do, YYYY [at] h:mm A')}`);
    
    const job = cron.schedule(cronExpression, async () => {
      console.log(`\n🎯 Executing one-time scheduled run: ${description}`);
      await this.runSummary(`one-time-${description}`);
      job.stop(); // Stop after running once
    }, {
      scheduled: true,
      timezone: this.timeZone
    });
    
    return {
      description: description,
      scheduledFor: targetMoment.toISOString(),
      cronExpression: cronExpression
    };
  }
}

// CLI interface for scheduler
async function main() {
  const scheduler = new Scheduler();
  const command = process.argv[2];

  switch (command) {
    case 'start':
      scheduler.start();
      
      // Keep the process alive
      console.log('\n🔄 Scheduler is running. Press Ctrl+C to stop.\n');
      
      // Graceful shutdown
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Received SIGINT, shutting down gracefully...');
        scheduler.stop();
        process.exit(0);
      });
      
      // Keep alive
      setInterval(() => {
        // Just to keep the process running
      }, 1000);
      break;
      
    case 'run':
      await scheduler.runSummary('manual');
      break;
      
    case 'status':
      const status = scheduler.getStatus();
      console.log('\n📊 Scheduler Status:');
      console.log(JSON.stringify(status, null, 2));
      break;
      
    case 'schedule':
      const datetime = process.argv[3];
      const description = process.argv[4] || 'Manual scheduled run';
      
      if (!datetime) {
        console.error('❌ Please provide a datetime (YYYY-MM-DD HH:mm)');
        process.exit(1);
      }
      
      try {
        const result = scheduler.scheduleOneTime(datetime, description);
        console.log('✅ One-time run scheduled:', JSON.stringify(result, null, 2));
        
        // Start scheduler if not running
        if (!scheduler.isRunning) {
          scheduler.start();
        }
        
        // Keep alive for the scheduled run
        console.log('\n🔄 Waiting for scheduled run. Press Ctrl+C to cancel.\n');
        process.on('SIGINT', () => {
          console.log('\n🛑 Cancelled');
          scheduler.stop();
          process.exit(0);
        });
        
        setInterval(() => {}, 1000);
      } catch (error) {
        console.error('❌ Scheduling failed:', error.message);
        process.exit(1);
      }
      break;
      
    default:
      console.log(`
🕐 EAssistant Scheduler Commands:

  npm run schedule start           Start the scheduler daemon
  npm run schedule run             Run summary immediately  
  npm run schedule status          Show scheduler status
  npm run schedule schedule <datetime> [description]  Schedule one-time run

Examples:
  npm run schedule start
  npm run schedule run
  npm run schedule schedule "2024-01-15 14:30" "Pre-meeting summary"
      `);
  }
}

// Export for use in other modules
module.exports = Scheduler;

// Run CLI if called directly
if (require.main === module) {
  main().catch(console.error);
}