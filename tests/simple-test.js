/**
 * Simple AlphaSignal Test - No Dependencies
 */

console.log('🧪 Running AlphaSignal Simple Test...\n');

// Test 1: Verify file structure
try {
  console.log('📋 Test 1: Checking file structure...');
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredDirs = [
    'src',
    'src/reports', 
    'src/subscribers',
    'src/payments',
    'src/alerts',
    'content',
    'content/daily',
    'content/weekly',
    'config',
    'tests',
    'docs'
  ];
  
  let missingDirs = 0;
  for (const dir of requiredDirs) {
    const fullPath = path.join(__dirname, '..', dir);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Missing directory: ${dir}`);
      missingDirs++;
    }
  }
  
  if (missingDirs === 0) {
    console.log('✅ Test 1 PASSED: All required directories exist\n');
  } else {
    console.log(`❌ Test 1 FAILED: ${missingDirs} directories missing\n`);
  }
} catch (error) {
  console.log(`❌ Test 1 FAILED: ${error.message}\n`);
}

// Test 2: Verify core files exist
try {
  console.log('📋 Test 2: Checking core files...');
  
  const fs = require('fs');
  
  const requiredFiles = [
    'package.json',
    'README.md',
    'src/index.js',
    'src/reports/DailyMarketBrief.js',
    'src/subscribers/SubscriberManager.js',
    'src/payments/PaymentProcessor.js',
    'src/alerts/ContradictionAlerts.js',
    'config/cron-schedule.json',
    'docs/DEPLOYMENT.md'
  ];
  
  let missingFiles = 0;
  for (const file of requiredFiles) {
    const fullPath = require('path').join(__dirname, '..', file);
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Missing file: ${file}`);
      missingFiles++;
    }
  }
  
  if (missingFiles === 0) {
    console.log('✅ Test 2 PASSED: All required files exist\n');
  } else {
    console.log(`❌ Test 2 FAILED: ${missingFiles} files missing\n`);
  }
} catch (error) {
  console.log(`❌ Test 2 FAILED: ${error.message}\n`);
}

// Test 3: Verify package.json content
try {
  console.log('📋 Test 3: Checking package.json...');
  
  const packageJson = require('../package.json');
  
  const requiredFields = ['name', 'version', 'description', 'main', 'scripts', 'dependencies'];
  let missingFields = 0;
  
  for (const field of requiredFields) {
    if (!(field in packageJson)) {
      console.log(`❌ Missing field in package.json: ${field}`);
      missingFields++;
    }
  }
  
  if (missingFields === 0) {
    console.log('✅ Test 3 PASSED: package.json has all required fields\n');
  } else {
    console.log(`❌ Test 3 FAILED: ${missingFields} fields missing in package.json\n`);
  }
} catch (error) {
  console.log(`❌ Test 3 FAILED: ${error.message}\n`);
}

console.log('🏁 Simple Tests Complete');
console.log('Note: Full integration tests require npm dependencies to be installed');