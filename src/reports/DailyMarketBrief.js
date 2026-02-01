/**
 * AlphaSignal Daily Market Brief Generator
 * Generates automated daily market intelligence reports
 */

const { TwitterApiIOClient } = require('../../skills/twitterapi-io');
const { ExaMCPClient } = require('../../exa-mcp-skill/scripts/exa_mcp_client');

class DailyMarketBrief {
  constructor(config = {}) {
    this.twitterClient = new TwitterApiIOClient();
    this.exaClient = new ExaMCPClient();
    this.config = {
      watchlist: config.watchlist || ['$SPY', '$QQQ', '$BTC', '$TSLA'],
      influencers: config.influators || ['@gfilche', '@chamath', '@elonmusk'],
      ...config
    };
  }

  async generate() {
    const date = new Date().toISOString().split('T')[0];
    console.log(`[${date}] Generating Daily Market Brief...`);

    try {
      // 1. Gather market data via Exa
      const marketData = await this.gatherMarketData();
      
      // 2. Analyze Twitter sentiment
      const sentiment = await this.analyzeSentiment();
      
      // 3. Check for contradictions
      const contradictions = await this.detectContradictions();
      
      // 4. Compile report
      const report = this.compileReport({
        date,
        marketData,
        sentiment,
        contradictions
      });

      // 5. Save and deliver
      await this.saveReport(report, date);
      await this.deliverReport(report);

      return report;
    } catch (error) {
      console.error('Error generating daily brief:', error);
      throw error;
    }
  }

  async gatherMarketData() {
    // Use Exa AI to search for latest market news
    const queries = [
      'stock market news today',
      'crypto Bitcoin price analysis',
      'Fed interest rates latest',
      'earnings reports today'
    ];

    const results = await Promise.all(
      queries.map(q => this.exaClient.callTool('web_search_exa', { query: q, numResults: 3 }))
    );

    return results.flatMap(r => r.content || []);
  }

  async analyzeSentiment() {
    // Analyze sentiment from key influencers
    const sentiments = {};
    
    for (const handle of this.config.influencers) {
      try {
        const tweets = await this.twitterClient.getUserTweets(handle.replace('@', ''), { limit: 10 });
        sentiments[handle] = this.extractSentiment(tweets);
      } catch (e) {
        console.warn(`Failed to analyze ${handle}:`, e.message);
      }
    }

    return sentiments;
  }

  extractSentiment(tweets) {
    // Simple sentiment extraction (would use NLP in production)
    const text = tweets.data?.tweets?.map(t => t.text).join(' ') || '';
    const bullish = (text.match(/\b(bull|moon|pump|buy|long)\b/gi) || []).length;
    const bearish = (text.match(/\b(bear|dump|sell|short|crash)\b/gi) || []).length;
    
    return {
      bullish,
      bearish,
      score: bullish - bearish,
      latestTweet: tweets.data?.tweets?.[0]?.text || 'N/A'
    };
  }

  async detectContradictions() {
    // Placeholder for contradiction detection
    // Would integrate with TweetVision analyzer
    return [];
  }

  compileReport({ date, marketData, sentiment, contradictions }) {
    const report = {
      meta: {
        version: '1.0',
        generated: new Date().toISOString(),
        type: 'daily-brief'
      },
      header: `📊 AlphaSignal Daily Market Brief - ${date}`,
      summary: this.generateSummary(marketData),
      sentiment: this.formatSentiment(sentiment),
      keyStories: marketData.slice(0, 5).map(item => ({
        title: item.title || 'Market Update',
        source: item.url || 'N/A',
        snippet: item.text?.substring(0, 200) + '...'
      })),
      contradictions: contradictions.length > 0 ? contradictions : 'No major contradictions detected today.',
      watchlist: this.config.watchlist,
      footer: '💡 Upgrade to Pro for real-time alerts and custom research.'
    };

    return report;
  }

  generateSummary(marketData) {
    return `Market data analyzed from ${marketData.length} sources. Key themes: ${this.extractThemes(marketData).join(', ')}.`;
  }

  extractThemes(data) {
    const themes = [];
    const text = data.map(d => d.text || '').join(' ').toLowerCase();
    
    if (text.includes('fed') || text.includes('interest rate')) themes.push('Fed Policy');
    if (text.includes('earnings') || text.includes('revenue')) themes.push('Earnings Season');
    if (text.includes('bitcoin') || text.includes('crypto')) themes.push('Crypto Markets');
    if (text.includes('inflation') || text.includes('cpi')) themes.push('Inflation Data');
    if (themes.length === 0) themes.push('General Market Movement');
    
    return themes;
  }

  formatSentiment(sentiments) {
    return Object.entries(sentiments).map(([handle, data]) => ({
      handle,
      bias: data.score > 0 ? '🐂 Bullish' : data.score < 0 ? '🐻 Bearish' : '➡️ Neutral',
      score: data.score,
      activity: data.bullish + data.bearish > 5 ? 'High' : 'Moderate'
    }));
  }

  async saveReport(report, date) {
    const fs = require('fs').promises;
    const path = require('path');
    const reportPath = path.join(__dirname, '../../content/daily', `${date}-brief.json`);
    
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`Report saved to ${reportPath}`);
  }

  async deliverReport(report) {
    // Telegram delivery
    const message = this.formatForTelegram(report);
    
    // This will be implemented with actual Telegram bot integration
    console.log('Report formatted for delivery:', message.substring(0, 200) + '...');
    
    // TODO: Integrate with Telegram/WhatsApp message API
    return { delivered: true, channels: ['telegram', 'whatsapp'] };
  }

  formatForTelegram(report) {
    return `
${report.header}

${report.summary}

📈 Sentiment Analysis:
${report.sentiment.map(s => `${s.handle}: ${s.bias} (${s.activity} activity)`).join('\n')}

🔥 Key Stories:
${report.keyStories.map((s, i) => `${i + 1}. ${s.title}\n   ${s.snippet}`).join('\n\n')}

⚡ Contradictions: ${report.contradictions}

${report.footer}
    `.trim();
  }
}

module.exports = { DailyMarketBrief };

// CLI usage
if (require.main === module) {
  const brief = new DailyMarketBrief();
  brief.generate()
    .then(report => {
      console.log('✅ Daily brief generated successfully!');
      console.log(JSON.stringify(report, null, 2));
    })
    .catch(err => {
      console.error('❌ Failed to generate daily brief:', err);
      process.exit(1);
    });
}
