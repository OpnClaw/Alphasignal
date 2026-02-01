/**
 * AlphaSignal Payment Processor
 * Handles subscription payments and billing
 */

const fs = require('fs').promises;
const path = require('path');

class PaymentProcessor {
  constructor(options = {}) {
    this.dataDir = options.dataDir || path.join(__dirname, '../../data');
    this.paymentsFile = path.join(this.dataDir, 'payments.json');
    this.subscriptionsFile = path.join(this.dataDir, 'subscriptions.json');
    
    // Mock Stripe client
    this.stripe = {
      customers: {
        create: async (customerData) => ({ id: `cus_${Date.now()}` }),
        retrieve: async (customerId) => ({ id: customerId })
      },
      subscriptions: {
        create: async (subscriptionData) => ({ 
          id: `sub_${Date.now()}`, 
          status: 'active',
          current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60 // 30 days from now
        }),
        cancel: async (subscriptionId) => ({ id: subscriptionId, status: 'canceled' })
      },
      prices: {
        list: async () => ({
          data: [
            { id: 'price_free', unit_amount: 0, currency: 'usd', recurring: { interval: 'month' } },
            { id: 'price_pro', unit_amount: 4900, currency: 'usd', recurring: { interval: 'month' } },
            { id: 'price_elite', unit_amount: 19900, currency: 'usd', recurring: { interval: 'month' } }
          ]
        })
      }
    };
  }

  async init() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Initialize payment files if they don't exist
    try {
      await fs.access(this.paymentsFile);
    } catch {
      await this.savePayments([]);
      console.log('✅ Created new payments database');
    }
    
    try {
      await fs.access(this.subscriptionsFile);
    } catch {
      await this.saveSubscriptions([]);
      console.log('✅ Created new subscriptions database');
    }
    
    console.log('✅ PaymentProcessor initialized');
  }

  async loadPayments() {
    try {
      const content = await fs.readFile(this.paymentsFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading payments:', error.message);
      return [];
    }
  }

  async savePayments(payments) {
    try {
      await fs.writeFile(this.paymentsFile, JSON.stringify(payments, null, 2));
    } catch (error) {
      console.error('Error saving payments:', error.message);
      throw error;
    }
  }

  async loadSubscriptions() {
    try {
      const content = await fs.readFile(this.subscriptionsFile, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Error loading subscriptions:', error.message);
      return [];
    }
  }

  async saveSubscriptions(subscriptions) {
    try {
      await fs.writeFile(this.subscriptionsFile, JSON.stringify(subscriptions, null, 2));
    } catch (error) {
      console.error('Error saving subscriptions:', error.message);
      throw error;
    }
  }

  async createCustomer(email, name) {
    try {
      // Create customer in mock Stripe
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: { source: 'alphasignal' }
      });

      // Record in our system
      const payments = await this.loadPayments();
      payments.push({
        id: customer.id,
        email,
        name,
        createdAt: new Date().toISOString(),
        status: 'verified'
      });

      await this.savePayments(payments);

      console.log(`👤 Created customer: ${email} (${customer.id})`);
      return customer;
    } catch (error) {
      console.error('Error creating customer:', error.message);
      throw error;
    }
  }

  async createSubscription(customerId, tier) {
    try {
      // Determine price based on tier
      const prices = await this.stripe.prices.list();
      const tierMap = { 
        'free': 'price_free', 
        'pro': 'price_pro', 
        'elite': 'price_elite' 
      };
      
      const priceId = tierMap[tier];
      if (!priceId) {
        throw new Error(`Invalid tier: ${tier}`);
      }

      // Create subscription in mock Stripe
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent']
      });

      // Record in our system
      const subscriptions = await this.loadSubscriptions();
      subscriptions.push({
        id: subscription.id,
        customerId,
        tier,
        status: subscription.status,
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        priceId
      });

      await this.saveSubscriptions(subscriptions);

      console.log(`💳 Created subscription: ${subscription.id} for ${customerId} (tier: ${tier})`);
      return subscription;
    } catch (error) {
      console.error('Error creating subscription:', error.message);
      throw error;
    }
  }

  async cancelSubscription(subscriptionId) {
    try {
      // Cancel in mock Stripe
      const result = await this.stripe.subscriptions.cancel(subscriptionId);

      // Update in our system
      const subscriptions = await this.loadSubscriptions();
      const subIndex = subscriptions.findIndex(s => s.id === subscriptionId);
      
      if (subIndex !== -1) {
        subscriptions[subIndex].status = 'canceled';
        subscriptions[subIndex].canceledAt = new Date().toISOString();
        await this.saveSubscriptions(subscriptions);
      }

      console.log(`❌ Canceled subscription: ${subscriptionId}`);
      return result;
    } catch (error) {
      console.error('Error canceling subscription:', error.message);
      throw error;
    }
  }

  async getCustomerSubscriptions(customerId) {
    const subscriptions = await this.loadSubscriptions();
    return subscriptions.filter(s => s.customerId === customerId);
  }

  async getActiveSubscriptions() {
    const subscriptions = await this.loadSubscriptions();
    return subscriptions.filter(s => s.status === 'active');
  }

  async processPayment(paymentData) {
    // Simulate payment processing
    const payment = {
      id: `pay_${Date.now()}`,
      amount: paymentData.amount,
      currency: paymentData.currency || 'usd',
      customerId: paymentData.customerId,
      subscriptionId: paymentData.subscriptionId,
      status: 'succeeded',
      createdAt: new Date().toISOString(),
      metadata: paymentData.metadata || {}
    };

    const payments = await this.loadPayments();
    payments.push(payment);
    await this.savePayments(payments);

    console.log(`💰 Processed payment: ${payment.id} for $${payment.amount / 100}`);
    return payment;
  }

  async refundPayment(paymentId, reason = 'requested_by_customer') {
    const payments = await this.loadPayments();
    const paymentIndex = payments.findIndex(p => p.id === paymentId);

    if (paymentIndex === -1) {
      throw new Error(`Payment ${paymentId} not found`);
    }

    payments[paymentIndex].status = 'refunded';
    payments[paymentIndex].refundedAt = new Date().toISOString();
    payments[paymentIndex].refundReason = reason;

    await this.savePayments(payments);

    console.log(`💸 Refunded payment: ${paymentId}`);
    return payments[paymentIndex];
  }

  async getBillingInfo(customerId) {
    const subscriptions = await this.getCustomerSubscriptions(customerId);
    const payments = await this.loadPayments();
    
    const customerPayments = payments.filter(p => p.customerId === customerId);
    
    return {
      customerId,
      subscriptions,
      paymentHistory: customerPayments.slice(-10), // Last 10 payments
      totalPaid: customerPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
    };
  }

  async syncWithStripe() {
    // In a real implementation, this would sync with actual Stripe data
    console.log('🔄 Syncing with Stripe (mock implementation)');
    return { status: 'completed', recordsProcessed: 0 };
  }
}

module.exports = { PaymentProcessor };

// CLI usage
if (require.main === module) {
  const processor = new PaymentProcessor();
  
  // Example usage
  (async () => {
    await processor.init();
    console.log('✅ PaymentProcessor initialized and ready');
  })();
}
