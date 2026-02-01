# AlphaSignal Deployment Guide

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Stripe API key
- TwitterAPI.io API key
- Exa AI API key
- Telegram bot token (optional)
- WhatsApp business account (optional)

## Environment Setup

Create a `.env` file in the root directory:

```env
STRIPE_SECRET_KEY=sk_live_...
TWITTERAPI_IO_KEY=...
EXA_API_KEY=...
TELEGRAM_BOT_TOKEN=...
WHATSAPP_API_KEY=...
NODE_ENV=production
PORT=3000
```

## Installation

```bash
cd /home/brian/.openclaw/workspace/alphasignal
npm install
```

## Configuration

1. **Cron Jobs**: The system uses cron jobs defined in `config/cron-schedule.json`
2. **Skills Integration**: Ensure TwitterAPI.io and Exa AI skills are properly configured
3. **Payment Processor**: Configure Stripe with your pricing tiers
4. **Delivery Methods**: Set up Telegram/WhatsApp for subscriber communication

## Deployment Options

### Option 1: Local Development
```bash
npm run dev
```

### Option 2: Production with PM2
```bash
npm install -g pm2
npm run start
```

### Option 3: Docker (Coming Soon)
```dockerfile
# Coming soon
```

## Services Integration

### TwitterAPI.io
- Used for contradiction detection and sentiment analysis
- Requires valid API key in environment
- Configured in `skills/twitterapi-io/`

### Exa AI
- Used for market research and news gathering
- Requires valid API key in environment

### Stripe
- Handles subscription payments
- Configure pricing tiers in `src/payments/PaymentProcessor.js`
- Webhook endpoint: `/webhooks/stripe` (implement separately)

### Telegram/WhatsApp
- For delivering reports and alerts
- Configure bot tokens in environment
- Implement delivery methods in `src/subscribers/SubscriberManager.js`

## Monitoring & Maintenance

### Cron Jobs
- Daily Market Brief: 8:00 AM Dubai time (weekdays)
- Weekly Deep Dive: 9:00 AM Sunday (Dubai time)
- Contradiction Checker: Every 30 minutes (weekdays)
- Data Backup: Daily at 2:00 AM

### Data Storage
- Subscribers: `data/subscribers.json`
- Payments: `data/payments.json`
- Subscriptions: `data/subscriptions.json`
- Alerts: `data/contradiction-alerts.json`
- Reports: `content/daily/` and `content/weekly/`

## Scaling Considerations

1. **Database**: Replace JSON files with PostgreSQL/MongoDB for production
2. **Caching**: Implement Redis for frequently accessed data
3. **Queue**: Use BullMQ for processing heavy tasks
4. **CDN**: Serve static content via CDN
5. **Load Balancing**: Multiple instances behind a load balancer

## Security

1. Store API keys securely in environment variables
2. Implement rate limiting for API endpoints
3. Sanitize all user inputs
4. Use HTTPS in production
5. Regular security audits

## Troubleshooting

### Common Issues

**Issue**: Twitter API rate limits
**Solution**: Implement exponential backoff and check API quota

**Issue**: Stripe webhook failures
**Solution**: Verify webhook endpoint and secret key

**Issue**: Memory leaks in cron jobs
**Solution**: Ensure proper cleanup in each job

### Logs
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Cron job logs: `logs/cron.log`

## Updates & Maintenance

1. Regular dependency updates
2. Monitor API key quotas
3. Backup data regularly
4. Test cron jobs periodically
5. Monitor system performance

## Support

For technical support:
- Check logs first
- Verify environment variables
- Test individual components
- Contact development team if issues persist
