/**
 * AlphaSignal Email Service
 * Custom email integration using Gmail SMTP
 * Sends reports, alerts, and subscriber communications
 */

const nodemailer = require('nodemailer');
const fs = require('fs').promises;
const path = require('path');

class EmailService {
  constructor(config = {}) {
    this.config = {
      host: config.host || 'smtp.gmail.com',
      port: config.port || 587,
      secure: config.secure || false,
      user: config.user || 'opnclaw@gmail.com',
      pass: config.pass || process.env.GMAIL_APP_PASSWORD,
      from: config.from || 'AlphaSignal <opnclaw@gmail.com>',
      ...config
    };
    
    this.transporter = null;
    this.templatesDir = config.templatesDir || path.join(__dirname, '../templates/emails');
  }

  async init() {
    // Create transporter
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass
      }
    });

    // Verify connection
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected');
      return true;
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return false;
    }
  }

  // Send daily market brief
  async sendDailyBrief(subscriber, report) {
    const subject = `📊 AlphaSignal Daily Brief - ${report.date}`;
    
    const html = this.generateDailyBriefHTML(report);
    
    return this.send({
      to: subscriber.email,
      subject,
      html,
      text: this.generateDailyBriefText(report)
    });
  }

  // Send contradiction alert
  async sendContradictionAlert(subscriber, alert) {
    const subject = `⚡ Contradiction Alert: ${alert.account}`;
    
    const html = `
      <h2>Contradiction Detected</h2>
      <p><strong>Account:</strong> ${alert.account}</p>
      <p><strong>Type:</strong> ${alert.type}</p>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      
      <h3>Original Statement:</h3>
      <blockquote>${alert.tweet1?.text || 'N/A'}</blockquote>
      <p><small>${alert.tweet1?.timestamp || ''}</small></p>
      
      <h3>Contradicting Statement:</h3>
      <blockquote>${alert.tweet2?.text || 'N/A'}</blockquote>
      <p><small>${alert.tweet2?.timestamp || ''}</small></p>
      
      <hr>
      <p><a href="https://alphasignal.io/dashboard">View in Dashboard</a></p>
    `;
    
    return this.send({
      to: subscriber.email,
      subject,
      html,
      priority: 'high'
    });
  }

  // Send welcome email
  async sendWelcomeEmail(subscriber) {
    const subject = 'Welcome to AlphaSignal 🚀';
    
    const html = `
      <h1>Welcome to AlphaSignal!</h1>
      <p>Hi ${subscriber.email},</p>
      <p>You're now subscribed to <strong>${subscriber.tier}</strong> tier.</p>
      
      <h3>What you get:</h3>
      <ul>
        ${this.getTierFeatures(subscriber.tier).map(f => `<li>${f}</li>`).join('')}
      </ul>
      
      <p>Your first report will arrive soon.</p>
      
      <p>Questions? Reply to this email.</p>
      
      <p>— The AlphaSignal Team</p>
    `;
    
    return this.send({
      to: subscriber.email,
      subject,
      html
    });
  }

  // Generic send method
  async send({ to, subject, html, text, priority = 'normal', attachments = [] }) {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to,
        subject,
        html,
        text: text || this.stripHtml(html),
        priority: priority === 'high' ? 'high' : undefined,
        attachments
      });

      console.log(`📧 Email sent: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Generate daily brief HTML
  generateDailyBriefHTML(report) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 15px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 AlphaSignal Daily Brief</h1>
          <p>${report.date}</p>
        </div>
        
        <div class="content">
          <h2>Market Summary</h2>
          <p>${report.summary}</p>
          
          <h2>Key Findings</h2>
          <ul>
            ${report.keyFindings?.map(f => `<li>${f}</li>`).join('') || '<li>No major findings today</li>'}
          </ul>
          
          ${report.contradictions > 0 ? `
            <div class="alert">
              <strong>⚡ ${report.contradictions} Contradiction(s) Detected</strong>
              <p>Influential accounts have shifted their positions. Check your dashboard for details.</p>
            </div>
          ` : ''}
          
          <h2>Sentiment</h2>
          <p>Overall market sentiment: <strong>${report.sentiment || 'Neutral'}</strong></p>
        </div>
        
        <div class="footer">
          <p>AlphaSignal - AI-Powered Financial Intelligence</p>
          <p><a href="https://opnclaw.github.io/Alphasignal/">Visit Website</a> | <a href="#">Unsubscribe</a></p>
        </div>
      </body>
      </html>
    `;
  }

  // Generate plain text version
  generateDailyBriefText(report) {
    return `
AlphaSignal Daily Brief - ${report.date}

MARKET SUMMARY
${report.summary}

KEY FINDINGS
${report.keyFindings?.map(f => `- ${f}`).join('\n') || 'No major findings today'}

${report.contradictions > 0 ? `CONTRADICTIONS DETECTED: ${report.contradictions}\nInfluential accounts have shifted positions.` : ''}

SENTIMENT: ${report.sentiment || 'Neutral'}

---
AlphaSignal - AI-Powered Financial Intelligence
https://opnclaw.github.io/Alphasignal/
    `.trim();
  }

  // Get features for tier
  getTierFeatures(tier) {
    const features = {
      'free': ['Weekly market digest', 'Basic Twitter sentiment', 'Public reports'],
      'pro': ['Daily briefings', 'Real-time alerts', 'Watchlist monitoring', 'Priority support'],
      'elite': ['Real-time alerts', 'Custom research', '1:1 consultations', 'API access']
    };
    return features[tier] || features['free'];
  }

  // Strip HTML for text version
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Test connection
  async testConnection() {
    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service connected' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { EmailService };

// CLI test
if (require.main === module) {
  const email = new EmailService({
    pass: process.env.GMAIL_APP_PASSWORD || 'your-app-password-here'
  });
  
  (async () => {
    await email.init();
    
    // Test send
    const result = await email.send({
      to: 'opnclaw@gmail.com',
      subject: 'AlphaSignal Email Test',
      html: '<h1>Test</h1><p>Email service working!</p>'
    });
    
    console.log('Test result:', result);
  })();
}
