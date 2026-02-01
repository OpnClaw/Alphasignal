/**
 * AlphaSignal - Main Application Entry Point
 * Premium AI-powered financial intelligence service
 */

require('dotenv').config();
const cron = require('node-cron');
const { DailyMarketBrief } = require('./reports/DailyMarketBrief');
const { SubscriberManager } = require('./subscribers/SubscriberManager');
const { PaymentProcessor } = require('./payments/PaymentProcessor');
const { ContradictionAlerts } = require('./alerts/ContradictionAlerts');

class AlphaSignal {
  constructor() {
    this.subscriberManager = new SubscriberManager();
    this.paymentProcessor = new PaymentProcessor();
    this.contradictionAlerts = new ContradictionAlerts();
    this.dailyBrief = new DailyMarketBrief();
    
    this.init();
  }

  async init() {
    console.log('🚀 Initializing AlphaSignal Financial Intelligence Service...');
    
    // Initialize components
    await this.subscriberManager.init();
    await this.paymentProcessor.init();
    await this.contradictionAlerts.init();
    
    // Schedule cron jobs
    this.scheduleJobs();
    
    console.log('✅ AlphaSignal initialized successfully!');
  }

  scheduleJobs() {
    // Load cron jobs from config
    const cronConfig = require('../config/cron-schedule.json');
    
    cronConfig.jobs.forEach(job => {
      if (job.enabled) {
        cron.schedule(job.schedule.expr, async () => {
          console.log(`⏰ Executing scheduled job: ${job.name}`);
          try {
            // Execute job based on payload type
            await this.executeJob(job.payload);
          } catch (error) {
            console.error(`❌ Error executing job ${job.name}:`, error);
          }
        });
        
        console.log(`📅 Scheduled: ${job.name} (${job.schedule.expr})`);
      }
    });
  }

  async executeJob(payload) {
    switch (payload.kind) {
      case 'agentTurn':
        return this.handleAgentTurn(payload);
      default:
        throw new Error(`Unknown payload kind: ${payload.kind}`);
    }
  }

  async handleAgentTurn(payload) {
    // Simulate agent turn execution
    console.log(`🤖 Processing agent turn: ${payload.message}`);
    
    // Route to appropriate handler based on message content
    if (payload.message.includes('daily market brief')) {
      return await this.dailyBrief.generate();
    } else if (payload.message.includes('contradiction')) {
      return await this.contradictionAlerts.check();
    } else if (payload.message.includes('backup')) {
      return await this.backupData();
    } else {
      console.warn(`Unhandled agent turn: ${payload.message}`);
      return { status: 'unhandled', message: payload.message };
    }
  }

  async backupData() {
    // Backup subscriber data and reports
    const fs = require('fs').promises;
    const path = require('path');
    
    const backup = {
      timestamp: new Date().toISOString(),
      subscribers: await this.subscriberManager.getAll(),
      reports: await this.getRecentReports(),
      contradictions: await this.contradictionAlerts.getRecentAlerts()
    };
    
    const backupPath = path.join(__dirname, '../backups', `backup-${Date.now()}.json`);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`💾 Backup created: ${backupPath}`);
    return { status: 'success', path: backupPath };
  }

  async getRecentReports() {
    const fs = require('fs').promises;
    const path = require('path');
    
    const dailyDir = path.join(__dirname, '../content/daily');
    const weeklyDir = path.join(__dirname, '../content/weekly');
    
    const dailyFiles = await fs.readdir(dailyDir);
    const weeklyFiles = await fs.readdir(weeklyDir);
    
    // Return recent reports
    return {
      daily: dailyFiles.slice(-5).map(f => path.join(dailyDir, f)),
      weekly: weeklyFiles.slice(-2).map(f => path.join(weeklyDir, f))
    };
  }

  async start() {
    console.log('🌟 AlphaSignal is now running!');
    console.log('Listening for scheduled jobs and incoming requests...');
  }
}

// Export for module use
module.exports = { AlphaSignal };

// CLI usage
if (require.main === module) {
  const app = new AlphaSignal();
  
  app.start().catch(err => {
    console.error('❌ Failed to start AlphaSignal:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down AlphaSignal...');
    process.exit(0);
  });
}
