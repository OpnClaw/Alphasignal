/**
 * AlphaSignal Integration Tests
 * Verify all components work together
 */

const { AlphaSignal } = require('../src/index');
const { DailyMarketBrief } = require('../src/reports/DailyMarketBrief');
const { SubscriberManager } = require('../src/subscribers/SubscriberManager');
const { PaymentProcessor } = require('../src/payments/PaymentProcessor');
const { ContradictionAlerts } = require('../src/alerts/ContradictionAlerts');

async function runTests() {
  console.log('🧪 Running AlphaSignal Integration Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Initialize core system
  try {
    console.log('📋 Test 1: Initialize AlphaSignal system...');
    const app = new AlphaSignal();
    await app.init();
    console.log('✅ Test 1 PASSED: AlphaSignal initialized successfully\n');
    passed++;
  } catch (error) {
    console.log(`❌ Test 1 FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 2: Subscriber management
  try {
    console.log('📋 Test 2: Subscriber management...');
    const subManager = new SubscriberManager();
    await subManager.init();
    
    // Add a test subscriber
    const testSubscriber = await subManager.addSubscriber({
      id: 'test_user_123',
      email: 'test@example.com',
      tier: 'pro'
    });
    
    // Verify subscriber was added
    const retrieved = await subManager.getSubscriber('test_user_123');
    if (!retrieved || retrieved.email !== 'test@example.com') {
      throw new Error('Subscriber not found or incorrect data');
    }
    
    console.log('✅ Test 2 PASSED: Subscriber management works\n');
    passed++;
  } catch (error) {
    console.log(`❌ Test 2 FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 3: Payment processing
  try {
    console.log('📋 Test 3: Payment processing...');
    const paymentProcessor = new PaymentProcessor();
    await paymentProcessor.init();
    
    // Create a test customer
    const customer = await paymentProcessor.createCustomer('test@example.com', 'Test User');
    if (!customer.id.startsWith('cus_')) {
      throw new Error('Invalid customer ID');
    }
    
    // Create a test subscription
    const subscription = await paymentProcessor.createSubscription(customer.id, 'pro');
    if (!subscription.id.startsWith('sub_')) {
      throw new Error('Invalid subscription ID');
    }
    
    console.log('✅ Test 3 PASSED: Payment processing works\n');
    passed++;
  } catch (error) {
    console.log(`❌ Test 3 FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 4: Contradiction alerts
  try {
    console.log('📋 Test 4: Contradiction alerts...');
    const alerts = new ContradictionAlerts();
    await alerts.init();
    
    // Get initial tracked accounts
    const accounts = await alerts.getTrackedAccounts();
    if (accounts.length === 0) {
      throw new Error('No tracked accounts found');
    }
    
    console.log('✅ Test 4 PASSED: Contradiction alerts system initialized\n');
    passed++;
  } catch (error) {
    console.log(`❌ Test 4 FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Test 5: Daily market brief generation
  try {
    console.log('📋 Test 5: Daily market brief generation...');
    const brief = new DailyMarketBrief();
    const report = await brief.generate();
    
    if (!report || !report.header.includes('AlphaSignal Daily Market Brief')) {
      throw new Error('Invalid report generated');
    }
    
    console.log('✅ Test 5 PASSED: Daily market brief generated successfully\n');
    passed++;
  } catch (error) {
    console.log(`❌ Test 5 FAILED: ${error.message}\n`);
    failed++;
  }
  
  // Summary
  console.log('🏁 Integration Tests Complete');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! AlphaSignal is ready for launch.');
    return true;
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.');
    return false;
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test suite error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
