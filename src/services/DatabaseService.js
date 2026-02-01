/**
 * AlphaSignal Database Service
 * SQLite-based persistence for subscribers, reports, and analytics
 * Lightweight, zero-config, perfect for MVP
 */

const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

class DatabaseService {
  constructor(config = {}) {
    this.dbPath = config.dbPath || path.join(__dirname, '../../data/alphasignal.db');
    this.db = null;
  }

  async init() {
    // Open database
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Create tables
    await this.createTables();
    
    console.log('✅ Database initialized:', this.dbPath);
    return true;
  }

  async createTables() {
    // Subscribers table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        tier TEXT DEFAULT 'free',
        status TEXT DEFAULT 'active',
        join_date TEXT DEFAULT CURRENT_TIMESTAMP,
        last_active TEXT,
        delivery_preferences TEXT DEFAULT '["email"]',
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        metadata TEXT
      )
    `);

    // Reports table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        summary TEXT,
        contradictions_count INTEGER DEFAULT 0,
        sentiment TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Contradictions table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS contradictions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account TEXT NOT NULL,
        type TEXT NOT NULL,
        tweet1_id TEXT,
        tweet1_text TEXT,
        tweet1_timestamp TEXT,
        tweet2_id TEXT,
        tweet2_text TEXT,
        tweet2_timestamp TEXT,
        severity TEXT,
        detected_at TEXT DEFAULT CURRENT_TIMESTAMP,
        alerted BOOLEAN DEFAULT 0
      )
    `);

    // Sentiment tracking
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sentiment_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account TEXT NOT NULL,
        date TEXT NOT NULL,
        bullish_count INTEGER DEFAULT 0,
        bearish_count INTEGER DEFAULT 0,
        score INTEGER DEFAULT 0,
        activity_level TEXT,
        UNIQUE(account, date)
      )
    `);

    // Analytics/events
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        user_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_subscribers_email ON subscribers(email);
      CREATE INDEX IF NOT EXISTS idx_subscribers_tier ON subscribers(tier);
      CREATE INDEX IF NOT EXISTS idx_reports_date ON reports(date);
      CREATE INDEX IF NOT EXISTS idx_contradictions_account ON contradictions(account);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
    `);
  }

  // Subscriber operations
  async addSubscriber(subscriber) {
    const {
      id, email, tier = 'free', status = 'active',
      stripe_customer_id, stripe_subscription_id, metadata = {}
    } = subscriber;

    try {
      await this.db.run(
        `INSERT INTO subscribers 
         (id, email, tier, status, stripe_customer_id, stripe_subscription_id, metadata) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, email, tier, status, stripe_customer_id, stripe_subscription_id, JSON.stringify(metadata)]
      );
      return { success: true, id };
    } catch (error) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Email already exists' };
      }
      throw error;
    }
  }

  async getSubscriber(id) {
    const row = await this.db.get('SELECT * FROM subscribers WHERE id = ?', [id]);
    if (row) {
      row.metadata = JSON.parse(row.metadata || '{}');
      row.delivery_preferences = JSON.parse(row.delivery_preferences || '["email"]');
    }
    return row;
  }

  async getSubscriberByEmail(email) {
    const row = await this.db.get('SELECT * FROM subscribers WHERE email = ?', [email]);
    if (row) {
      row.metadata = JSON.parse(row.metadata || '{}');
      row.delivery_preferences = JSON.parse(row.delivery_preferences || '["email"]');
    }
    return row;
  }

  async getSubscribersByTier(tier) {
    const rows = await this.db.all(
      'SELECT * FROM subscribers WHERE tier = ? AND status = "active"',
      [tier]
    );
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      delivery_preferences: JSON.parse(row.delivery_preferences || '["email"]')
    }));
  }

  async getAllActiveSubscribers() {
    const rows = await this.db.all('SELECT * FROM subscribers WHERE status = "active"');
    return rows.map(row => ({
      ...row,
      metadata: JSON.parse(row.metadata || '{}'),
      delivery_preferences: JSON.parse(row.delivery_preferences || '["email"]')
    }));
  }

  async updateSubscriber(id, updates) {
    const fields = [];
    const values = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key === 'metadata') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(value));
      } else {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    values.push(id);

    await this.db.run(
      `UPDATE subscribers SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    return { success: true };
  }

  // Report operations
  async saveReport(report) {
    const result = await this.db.run(
      `INSERT INTO reports (date, type, content, summary, contradictions_count, sentiment)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        report.date,
        report.type || 'daily',
        JSON.stringify(report),
        report.summary,
        report.contradictions || 0,
        report.sentiment
      ]
    );
    return { success: true, id: result.lastID };
  }

  async getReport(id) {
    const row = await this.db.get('SELECT * FROM reports WHERE id = ?', [id]);
    if (row) {
      row.content = JSON.parse(row.content);
    }
    return row;
  }

  async getReportsByDateRange(startDate, endDate, type = 'daily') {
    const rows = await this.db.all(
      `SELECT * FROM reports 
       WHERE date BETWEEN ? AND ? AND type = ?
       ORDER BY date DESC`,
      [startDate, endDate, type]
    );
    return rows.map(row => ({
      ...row,
      content: JSON.parse(row.content)
    }));
  }

  // Contradiction operations
  async saveContradiction(contradiction) {
    const result = await this.db.run(
      `INSERT INTO contradictions 
       (account, type, tweet1_id, tweet1_text, tweet1_timestamp,
        tweet2_id, tweet2_text, tweet2_timestamp, severity)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        contradiction.account,
        contradiction.type,
        contradiction.tweet1?.id,
        contradiction.tweet1?.text,
        contradiction.tweet1?.timestamp,
        contradiction.tweet2?.id,
        contradiction.tweet2?.text,
        contradiction.tweet2?.timestamp,
        contradiction.severity
      ]
    );
    return { success: true, id: result.lastID };
  }

  async getRecentContradictions(limit = 10) {
    return await this.db.all(
      `SELECT * FROM contradictions 
       ORDER BY detected_at DESC 
       LIMIT ?`,
      [limit]
    );
  }

  async markContradictionAlerted(id) {
    await this.db.run(
      'UPDATE contradictions SET alerted = 1 WHERE id = ?',
      [id]
    );
    return { success: true };
  }

  // Analytics
  async logEvent(type, userId = null, metadata = {}) {
    await this.db.run(
      'INSERT INTO events (type, user_id, metadata) VALUES (?, ?, ?)',
      [type, userId, JSON.stringify(metadata)]
    );
  }

  async getEventStats(startDate, endDate) {
    const stats = await this.db.all(
      `SELECT type, COUNT(*) as count 
       FROM events 
       WHERE created_at BETWEEN ? AND ?
       GROUP BY type`,
      [startDate, endDate]
    );
    return stats;
  }

  // Stats
  async getSubscriberStats() {
    const stats = await this.db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN tier = 'free' THEN 1 ELSE 0 END) as free_count,
        SUM(CASE WHEN tier = 'pro' THEN 1 ELSE 0 END) as pro_count,
        SUM(CASE WHEN tier = 'elite' THEN 1 ELSE 0 END) as elite_count
      FROM subscribers
    `);
    return stats;
  }

  async close() {
    if (this.db) {
      await this.db.close();
      console.log('Database connection closed');
    }
  }
}

module.exports = { DatabaseService };

// CLI test
if (require.main === module) {
  const db = new DatabaseService();
  
  (async () => {
    await db.init();
    
    // Test subscriber
    await db.addSubscriber({
      id: 'test_123',
      email: 'test@example.com',
      tier: 'pro'
    });
    
    const stats = await db.getSubscriberStats();
    console.log('Stats:', stats);
    
    await db.close();
  })();
}
