/**
 * AlphaSignal Contradiction Alert System
 * Detects conflicting statements from tracked accounts and sends alerts
 */

const fs = require('fs').promises;
const path = require('path');

class ContradictionAlerts {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data');
    this.alertsFile = path.join(this.dataDir, 'contradiction-alerts.json');
    this.trackedAccounts = options.trackedAccounts || [
      '@gfilche', '@chamath', '@elonmusk', '@saylor', '@cz_binance',
      '@VitalikButerin', '@a16z', '@sequoiacap', '@paulg', '@sama'
    ];
    this.contradictionThreshold = options.contradictionThreshold || 3;
    this.alertCooldown = options.alertCooldown || 30 * 60 * 1000; // 30 minutes
    
    // Load TwitterAPI.io client
    this.twitterClient = null;
    this.loadTwitterClient();
  }

  async loadTwitterClient() {
    try {
      // Try to load the TwitterAPI.io client
      const { TwitterApiIOClient } = require('../../skills/twitterapi-io');
      this.twitterClient = new TwitterApiIOClient();
      console.log('✅ TwitterAPI.io client loaded for contradiction detection');
    } catch (error) {
      console.warn('⚠️ TwitterAPI.io client not available, using mock data');
      this.twitterClient = this.createMockTwitterClient();
    }
  }

  createMockTwitterClient() {
    return {
      getUserTweets: async (username, options = {}) => {
        // Return mock tweets for testing
        return {
          data: {
            tweets: [
              {
                id: `mock_tweet_${Date.now()}`,
                text: `Sample tweet from ${username} about market trends`,
                timestamp: new Date().toISOString(),
                metrics: { likes: 100, retweets: 50, replies: 20 }
              }
            ]
          }
        };
      },
      searchTweets: async (query, options = {}) => {
        return {
          data: {
            tweets: []
          }
        };
      }
    };
  }

  async init() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Initialize alerts file if it doesn't exist
    try {
      await fs.access(this.alertsFile);
    } catch {
      await this.saveAlerts([]);
      console.log('✅ Created new contradiction alerts database');
    }
    
    console.log('✅ ContradictionAlerts initialized');
  }

  async loadAlerts() {
    try {
      const content = await fs.readFile(this.alertsFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading alerts:', error.message);
      return [];
    }
  }

  async saveAlerts(alerts) {
    try {
      await fs.writeFile(this.alertsFile, JSON.stringify(alerts, null, 2));
    } catch (error) {
      console.error('Error saving alerts:', error.message);
      throw error;
    }
  }

  async check() {
    console.log('🔍 Checking for contradictions...');
    
    const allContradictions = [];
    
    for (const account of this.trackedAccounts) {
      try {
        const contradictions = await this.checkAccount(account);
        allContradictions.push(...contradictions);
      } catch (error) {
        console.error(`Error checking ${account}:`, error.message);
      }
    }
    
    if (allContradictions.length > 0) {
      console.log(`🔔 Found ${allContradictions.length} contradictions, processing alerts...`);
      await this.processAlerts(allContradictions);
    } else {
      console.log('✅ No contradictions detected');
    }
    
    return allContradictions;
  }

  async checkAccount(username) {
    // Get recent tweets from the account
    const response = await this.twitterClient.getUserTweets(username.replace('@', ''), { 
      limit: 20 
    });
    
    const tweets = response.data?.tweets || [];
    if (tweets.length < 2) {
      return []; // Need at least 2 tweets to find contradictions
    }
    
    // Look for contradictory statements
    const contradictions = this.findContradictions(tweets);
    
    if (contradictions.length > 0) {
      console.log(`⚠️ Found ${contradictions.length} contradictions in ${username}'s recent tweets`);
    }
    
    return contradictions.map(c => ({
      ...c,
      account: username,
      detectedAt: new Date().toISOString()
    }));
  }

  findContradictions(tweets) {
    // Simple contradiction detection algorithm
    // In a real implementation, this would use more sophisticated NLP
    const contradictions = [];
    
    // Sort tweets by time (newest first)
    const sortedTweets = [...tweets].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Compare recent tweets with older ones for contradictions
    for (let i = 0; i < sortedTweets.length; i++) {
      for (let j = i + 1; j < sortedTweets.length; j++) {
        const contradiction = this.compareTweets(sortedTweets[i], sortedTweets[j]);
        if (contradiction) {
          contradictions.push(contradiction);
        }
      }
    }
    
    return contradictions;
  }

  compareTweets(tweet1, tweet2) {
    // Simple contradiction detection based on keywords
    const text1 = tweet1.text.toLowerCase();
    const text2 = tweet2.text.toLowerCase();
    
    // Look for bullish vs bearish sentiment changes
    const bullishTerms = ['bull', 'buy', 'long', 'moon', 'pump', 'up', 'gain', 'profit'];
    const bearishTerms = ['bear', 'sell', 'short', 'dump', 'down', 'loss', 'crash', 'fall'];
    
    const tweet1Bullish = bullishTerms.some(term => text1.includes(term));
    const tweet1Bearish = bearishTerms.some(term => text1.includes(term));
    const tweet2Bullish = bullishTerms.some(term => text2.includes(term));
    const tweet2Bearish = bearishTerms.some(term => text2.includes(term));
    
    // Check for bullish -> bearish or bearish -> bullish shift
    if ((tweet1Bullish && tweet2Bearish) || (tweet1Bearish && tweet2Bullish)) {
      return {
        type: 'sentiment-contradiction',
        tweet1: { id: tweet1.id, text: tweet1.text, timestamp: tweet1.timestamp },
        tweet2: { id: tweet2.id, text: tweet2.text, timestamp: tweet2.timestamp },
        severity: this.calculateSeverity(tweet1, tweet2)
      };
    }
    
    // Look for specific keyword contradictions
    const keywords = ['bitcoin', 'ethereum', 'tesla', 'spacex', 'dogecoin', 'crypto'];
    for (const keyword of keywords) {
      if (text1.includes(keyword) && text2.includes(keyword)) {
        // Check for positive vs negative sentiment on same topic
        const sentiment1 = this.assessSentiment(text1);
        const sentiment2 = this.assessSentiment(text2);
        
        if (Math.sign(sentiment1) !== Math.sign(sentiment2) && 
            Math.abs(sentiment1) >= 0.5 && Math.abs(sentiment2) >= 0.5) {
          return {
            type: 'topic-contradiction',
            keyword,
            tweet1: { id: tweet1.id, text: tweet1.text, timestamp: tweet1.timestamp },
            tweet2: { id: tweet2.id, text: tweet2.text, timestamp: tweet2.timestamp },
            sentiment1,
            sentiment2,
            severity: this.calculateSeverity(tweet1, tweet2)
          };
        }
      }
    }
    
    return null;
  }

  assessSentiment(text) {
    // Very simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'love', 'amazing', 'fantastic', 'perfect', 'awesome'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'worst', 'disappointing', 'fail'];
    
    const posCount = positiveWords.filter(word => text.includes(word)).length;
    const negCount = negativeWords.filter(word => text.includes(word)).length;
    
    return posCount - negCount;
  }

  calculateSeverity(tweet1, tweet2) {
    // Calculate severity based on engagement metrics
    const engagement1 = (tweet1.metrics?.likes || 0) + (tweet1.metrics?.retweets || 0);
    const engagement2 = (tweet2.metrics?.likes || 0) + (tweet2.metrics?.retweets || 0);
    
    return Math.max(engagement1, engagement2) > 100 ? 'high' : 'medium';
  }

  async processAlerts(contradictions) {
    const alerts = await this.loadAlerts();
    const newAlerts = [];
    
    for (const contradiction of contradictions) {
      // Check if we've recently alerted about this contradiction
      const recentAlert = alerts.find(alert => 
        alert.account === contradiction.account &&
        alert.type === contradiction.type &&
        Date.now() - new Date(alert.detectedAt).getTime() < this.alertCooldown
      );
      
      if (!recentAlert) {
        // Create new alert
        const alert = {
          id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...contradiction,
          createdAt: new Date().toISOString()
        };
        
        newAlerts.push(alert);
        alerts.push(alert);
      }
    }
    
    if (newAlerts.length > 0) {
      await this.saveAlerts(alerts);
      console.log(`🔔 Generated ${newAlerts.length} new contradiction alerts`);
      
      // Send alerts to subscribers
      await this.sendAlertsToSubscribers(newAlerts);
    }
  }

  async sendAlertsToSubscribers(alerts) {
    // This would integrate with the subscriber management system
    // For now, just log the alerts
    
    for (const alert of alerts) {
      console.log(`📤 Alert sent: ${alert.account} - ${alert.type} contradiction detected`);
      
      // In a real implementation, this would:
      // 1. Get elite subscribers from SubscriberManager
      // 2. Format alert for delivery
      // 3. Send via Telegram/WhatsApp/email
    }
  }

  async getRecentAlerts(limit = 10) {
    const alerts = await this.loadAlerts();
    return alerts.slice(-limit).reverse(); // Return most recent first
  }

  async getAlertsByAccount(account) {
    const alerts = await this.loadAlerts();
    return alerts.filter(alert => alert.account === account);
  }

  async getAlertsByType(type) {
    const alerts = await this.loadAlerts();
    return alerts.filter(alert => alert.type === type);
  }

  async addTrackedAccount(account) {
    if (!this.trackedAccounts.includes(account)) {
      this.trackedAccounts.push(account);
      console.log(`✅ Added ${account} to tracked accounts`);
      return true;
    }
    return false;
  }

  async removeTrackedAccount(account) {
    const index = this.trackedAccounts.indexOf(account);
    if (index !== -1) {
      this.trackedAccounts.splice(index, 1);
      console.log(`✅ Removed ${account} from tracked accounts`);
      return true;
    }
    return false;
  }

  async getTrackedAccounts() {
    return this.trackedAccounts;
  }

  async resetAlerts() {
    await this.saveAlerts([]);
    console.log('🗑️ Cleared all contradiction alerts');
  }
}

module.exports = { ContradictionAlerts };

// CLI usage
if (require.main === module) {
  const alerts = new ContradictionAlerts();
  
  (async () => {
    await alerts.init();
    console.log('✅ ContradictionAlerts system ready');
    
    // Test run
    const results = await alerts.check();
    console.log(`Test check found ${results.length} contradictions`);
  })();
}
