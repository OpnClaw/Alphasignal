/**
 * AlphaSignal Subscriber Management System
 * Handles subscription tiers, user management, and delivery preferences
 */

const fs = require('fs').promises;
const path = require('path');

class SubscriberManager {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data');
    this.subscribersFile = path.join(this.dataDir, 'subscribers.json');
    this.deliveryMethods = ['telegram', 'whatsapp', 'email'];
    this.tiers = {
      'free': { name: 'Free', price: 0, features: ['weekly digest', 'basic reports'] },
      'pro': { name: 'Pro', price: 49, features: ['daily briefs', 'contradiction alerts', 'watchlist monitoring'] },
      'elite': { name: 'Elite', price: 199, features: ['real-time alerts', 'custom research', '1:1 consultations'] }
    };
  }

  async init() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Initialize subscribers file if it doesn't exist
    try {
      await fs.access(this.subscribersFile);
    } catch {
      await this.saveSubscribers([]);
      console.log('✅ Created new subscribers database');
    }
    
    console.log('✅ SubscriberManager initialized');
  }

  async getAll() {
    const data = await this.loadSubscribers();
    return data;
  }

  async loadSubscribers() {
    try {
      const content = await fs.readFile(this.subscribersFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading subscribers:', error.message);
      return [];
    }
  }

  async saveSubscribers(subscribers) {
    try {
      await fs.writeFile(this.subscribersFile, JSON.stringify(subscribers, null, 2));
    } catch (error) {
      console.error('Error saving subscribers:', error.message);
      throw error;
    }
  }

  async addSubscriber(subscriberData) {
    const subscribers = await this.loadSubscribers();
    
    // Validate input
    if (!subscriberData.id || !subscriberData.email) {
      throw new Error('Subscriber must have id and email');
    }
    
    // Check if subscriber already exists
    const existing = subscribers.find(s => s.id === subscriberData.id || s.email === subscriberData.email);
    if (existing) {
      throw new Error('Subscriber already exists');
    }
    
    // Set defaults
    const newSubscriber = {
      id: subscriberData.id,
      email: subscriberData.email,
      tier: subscriberData.tier || 'free',
      joinDate: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      deliveryPreferences: subscriberData.deliveryPreferences || ['telegram'],
      status: 'active',
      features: this.tiers[subscriberData.tier]?.features || this.tiers.free.features
    };
    
    subscribers.push(newSubscriber);
    await this.saveSubscribers(subscribers);
    
    console.log(`👤 Added new subscriber: ${subscriberData.email} (tier: ${newSubscriber.tier})`);
    return newSubscriber;
  }

  async updateSubscriber(id, updates) {
    const subscribers = await this.loadSubscribers();
    const index = subscribers.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error(`Subscriber with id ${id} not found`);
    }
    
    // Update fields
    subscribers[index] = {
      ...subscribers[index],
      ...updates,
      lastUpdated: new Date().toISOString()
    };
    
    await this.saveSubscribers(subscribers);
    console.log(`👤 Updated subscriber: ${id}`);
    return subscribers[index];
  }

  async getSubscriber(id) {
    const subscribers = await this.loadSubscribers();
    return subscribers.find(s => s.id === id);
  }

  async getSubscribersByTier(tier) {
    const subscribers = await this.loadSubscribers();
    return subscribers.filter(s => s.tier === tier && s.status === 'active');
  }

  async getActiveSubscribers() {
    const subscribers = await this.loadSubscribers();
    return subscribers.filter(s => s.status === 'active');
  }

  async deactivateSubscriber(id) {
    const subscribers = await this.loadSubscribers();
    const index = subscribers.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error(`Subscriber with id ${id} not found`);
    }
    
    subscribers[index].status = 'inactive';
    subscribers[index].deactivatedDate = new Date().toISOString();
    
    await this.saveSubscribers(subscribers);
    console.log(`👤 Deactivated subscriber: ${id}`);
    return subscribers[index];
  }

  async getStats() {
    const subscribers = await this.loadSubscribers();
    const active = subscribers.filter(s => s.status === 'active');
    
    const stats = {
      total: subscribers.length,
      active: active.length,
      inactive: subscribers.length - active.length,
      tierBreakdown: {}
    };
    
    // Count by tier
    active.forEach(sub => {
      stats.tierBreakdown[sub.tier] = (stats.tierBreakdown[sub.tier] || 0) + 1;
    });
    
    return stats;
  }

  async getDeliveryRecipients(tier = null) {
    const subscribers = await this.loadSubscribers();
    const active = subscribers.filter(s => s.status === 'active');
    
    if (tier) {
      return active.filter(s => s.tier === tier);
    }
    
    return active;
  }

  async validateDeliveryPreference(preference) {
    return this.deliveryMethods.includes(preference);
  }

  async validateTier(tier) {
    return Object.keys(this.tiers).includes(tier);
  }

  async getTierDetails(tier) {
    return this.tiers[tier] || null;
  }
}

module.exports = { SubscriberManager };

// CLI usage
if (require.main === module) {
  const manager = new SubscriberManager();
  
  // Example usage
  (async () => {
    await manager.init();
    
    console.log('📊 Subscriber stats:', await manager.getStats());
    console.log('✅ SubscriberManager test completed');
  })();
}
