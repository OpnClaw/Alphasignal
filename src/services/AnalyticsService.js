/**
 * AlphaSignal Analytics & Monitoring Service
 * Tracks system health, API usage, subscriber engagement
 * Provides insights for optimization
 */

const fs = require('fs').promises;
const path = require('path');

class AnalyticsService {
  constructor(config = {}) {
    this.dataDir = config.dataDir || path.join(__dirname, '../../data/analytics');
    this.metricsFile = path.join(this.dataDir, 'metrics.json');
    this.dailyStatsFile = path.join(this.dataDir, 'daily-stats.json');
    
    this.metrics = {
      apiCalls: {},
      errors: [],
      performance: [],
      subscriberActivity: {}
    };
    
    this.dailyStats = {};
  }

  async init() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Load existing metrics
    await this.loadMetrics();
    await this.loadDailyStats();
    
    console.log('✅ Analytics service initialized');
    return true;
  }

  async loadMetrics() {
    try {
      const content = await fs.readFile(this.metricsFile, 'utf8');
      this.metrics = JSON.parse(content);
    } catch {
      // No existing metrics, start fresh
      this.metrics = {
        apiCalls: {},
        errors: [],
        performance: [],
        subscriberActivity: {},
        startTime: new Date().toISOString()
      };
    }
  }

  async loadDailyStats() {
    try {
      const content = await fs.readFile(this.dailyStatsFile, 'utf8');
      this.dailyStats = JSON.parse(content);
    } catch {
      this.dailyStats = {};
    }
  }

  async saveMetrics() {
    await fs.writeFile(this.metricsFile, JSON.stringify(this.metrics, null, 2));
  }

  async saveDailyStats() {
    await fs.writeFile(this.dailyStatsFile, JSON.stringify(this.dailyStats, null, 2));
  }

  // Track API call
  trackApiCall(service, endpoint, duration, success = true) {
    const key = `${service}:${endpoint}`;
    
    if (!this.metrics.apiCalls[key]) {
      this.metrics.apiCalls[key] = {
        count: 0,
        errors: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    
    const stat = this.metrics.apiCalls[key];
    stat.count++;
    stat.totalDuration += duration;
    stat.avgDuration = stat.totalDuration / stat.count;
    
    if (!success) {
      stat.errors++;
    }
    
    // Auto-save every 10 calls
    if (stat.count % 10 === 0) {
      this.saveMetrics().catch(console.error);
    }
  }

  // Track error
  async trackError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      context
    };
    
    this.metrics.errors.push(errorRecord);
    
    // Keep only last 100 errors
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-100);
    }
    
    await this.saveMetrics();
  }

  // Track subscriber activity
  async trackSubscriberActivity(subscriberId, action, metadata = {}) {
    if (!this.metrics.subscriberActivity[subscriberId]) {
      this.metrics.subscriberActivity[subscriberId] = {
        lastActive: null,
        actions: []
      };
    }
    
    const record = {
      timestamp: new Date().toISOString(),
      action,
      metadata
    };
    
    this.metrics.subscriberActivity[subscriberId].actions.push(record);
    this.metrics.subscriberActivity[subscriberId].lastActive = record.timestamp;
    
    // Keep only last 50 actions per subscriber
    if (this.metrics.subscriberActivity[subscriberId].actions.length > 50) {
      this.metrics.subscriberActivity[subscriberId].actions = 
        this.metrics.subscriberActivity[subscriberId].actions.slice(-50);
    }
    
    await this.saveMetrics();
  }

  // Daily stats aggregation
  async recordDailyStats(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    if (!this.dailyStats[targetDate]) {
      this.dailyStats[targetDate] = {
        date: targetDate,
        apiCalls: 0,
        errors: 0,
        emailsSent: 0,
        reportsGenerated: 0,
        contradictionsFound: 0,
        newSubscribers: 0,
        unsubscribes: 0
      };
    }
    
    await this.saveDailyStats();
    return this.dailyStats[targetDate];
  }

  async incrementDailyStat(date, stat, amount = 1) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    if (!this.dailyStats[targetDate]) {
      await this.recordDailyStats(targetDate);
    }
    
    this.dailyStats[targetDate][stat] += amount;
    await this.saveDailyStats();
  }

  // Performance tracking
  async trackPerformance(operation, duration, metadata = {}) {
    this.metrics.performance.push({
      timestamp: new Date().toISOString(),
      operation,
      duration,
      metadata
    });
    
    // Keep only last 1000 performance records
    if (this.metrics.performance.length > 1000) {
      this.metrics.performance = this.metrics.performance.slice(-1000);
    }
    
    await this.saveMetrics();
  }

  // Get API health
  getApiHealth() {
    const health = {};
    
    Object.entries(this.metrics.apiCalls).forEach(([key, stats]) => {
      const errorRate = stats.count > 0 ? (stats.errors / stats.count) * 100 : 0;
      health[key] = {
        totalCalls: stats.count,
        errorRate: errorRate.toFixed(2) + '%',
        avgDuration: stats.avgDuration.toFixed(2) + 'ms',
        status: errorRate > 10 ? 'degraded' : errorRate > 5 ? 'warning' : 'healthy'
      };
    });
    
    return health;
  }

  // Get subscriber engagement
  getSubscriberEngagement(subscriberId = null) {
    if (subscriberId) {
      return this.metrics.subscriberActivity[subscriberId] || null;
    }
    
    // Aggregate all subscribers
    const engagement = {
      totalActive: 0,
      totalInactive: 0,
      avgActionsPerUser: 0,
      mostActiveUsers: []
    };
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    
    let totalActions = 0;
    const userActivity = [];
    
    Object.entries(this.metrics.subscriberActivity).forEach(([id, data]) => {
      const lastActive = data.lastActive ? new Date(data.lastActive) : null;
      const isActive = lastActive && lastActive > thirtyDaysAgo;
      
      if (isActive) {
        engagement.totalActive++;
      } else {
        engagement.totalInactive++;
      }
      
      totalActions += data.actions.length;
      userActivity.push({ id, actions: data.actions.length, lastActive: data.lastActive });
    });
    
    const totalUsers = engagement.totalActive + engagement.totalInactive;
    engagement.avgActionsPerUser = totalUsers > 0 ? (totalActions / totalUsers).toFixed(2) : 0;
    
    // Top 5 most active users
    engagement.mostActiveUsers = userActivity
      .sort((a, b) => b.actions - a.actions)
      .slice(0, 5);
    
    return engagement;
  }

  // Get daily stats for date range
  getDailyStatsRange(startDate, endDate) {
    const stats = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      stats.push(this.dailyStats[dateStr] || {
        date: dateStr,
        apiCalls: 0,
        errors: 0,
        emailsSent: 0,
        reportsGenerated: 0,
        contradictionsFound: 0,
        newSubscribers: 0,
        unsubscribes: 0
      });
    }
    
    return stats;
  }

  // Generate report
  async generateReport() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 30 * 24 * 60 * 60 * 1000);
    
    const report = {
      generatedAt: now.toISOString(),
      uptime: this.metrics.startTime ? 
        Math.floor((now - new Date(this.metrics.startTime)) / 1000 / 60 / 60) + ' hours' : 'N/A',
      apiHealth: this.getApiHealth(),
      subscriberEngagement: this.getSubscriberEngagement(),
      recentErrors: this.metrics.errors.slice(-10),
      dailyStatsLast30Days: this.getDailyStatsRange(
        thirtyDaysAgo.toISOString().split('T')[0],
        now.toISOString().split('T')[0]
      )
    };
    
    return report;
  }

  // Cleanup old data
  async cleanup(keepDays = 30) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - keepDays);
    
    // Clean old errors
    this.metrics.errors = this.metrics.errors.filter(
      e => new Date(e.timestamp) > cutoff
    );
    
    // Clean old performance data
    this.metrics.performance = this.metrics.performance.filter(
      p => new Date(p.timestamp) > cutoff
    );
    
    // Clean old daily stats
    Object.keys(this.dailyStats).forEach(date => {
      if (new Date(date) < cutoff) {
        delete this.dailyStats[date];
      }
    });
    
    await this.saveMetrics();
    await this.saveDailyStats();
    
    console.log(`🧹 Cleaned up data older than ${keepDays} days`);
  }
}

module.exports = { AnalyticsService };

// CLI test
if (require.main === module) {
  const analytics = new AnalyticsService();
  
  (async () => {
    await analytics.init();
    
    // Test tracking
    analytics.trackApiCall('twitter', 'getUserTweets', 150, true);
    analytics.trackApiCall('exa', 'search', 230, true);
    
    await analytics.incrementDailyStats(null, 'apiCalls', 2);
    
    const report = await analytics.generateReport();
    console.log('Analytics report:', JSON.stringify(report, null, 2));
  })();
}
