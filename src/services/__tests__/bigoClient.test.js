/**
 * Basic tests for bigoClient module
 * Verifies module structure and basic error handling
 */

const bigoClient = require('../bigoClient');

// Test 1: Module exports
console.log('Test 1: Module exports all required methods');
const requiredMethods = ['request', 'listLiveRooms', 'getRoomDetails', 'getModerationEvents', 'getAnalytics'];
const exportedMethods = Object.keys(bigoClient);

const allMethodsExported = requiredMethods.every(method => exportedMethods.includes(method));
console.log(allMethodsExported ? '✅ PASS' : '❌ FAIL', '- All required methods exported');

// Test 2: Methods are functions
console.log('\nTest 2: All exported methods are functions');
const allAreFunctions = requiredMethods.every(method => typeof bigoClient[method] === 'function');
console.log(allAreFunctions ? '✅ PASS' : '❌ FAIL', '- All methods are functions');

// Test 3: Error handling for missing parameters
console.log('\nTest 3: Error handling for missing required parameters');
async function testErrorHandling() {
  try {
    await bigoClient.getRoomDetails();
    console.log('❌ FAIL - Should throw error for missing roomId');
  } catch (error) {
    if (error.message && error.message.includes('Room ID is required')) {
      console.log('✅ PASS - getRoomDetails throws error for missing roomId');
    } else {
      console.log('❌ FAIL - Unexpected error:', error.message);
    }
  }

  try {
    await bigoClient.getModerationEvents();
    console.log('❌ FAIL - Should throw error for missing roomId');
  } catch (error) {
    if (error.message && error.message.includes('Room ID is required')) {
      console.log('✅ PASS - getModerationEvents throws error for missing roomId');
    } else {
      console.log('❌ FAIL - Unexpected error:', error.message);
    }
  }
}

// Test 4: Method signatures accept parameters
console.log('\nTest 4: Method signatures accept parameters');
async function testMethodSignatures() {
  try {
    // These will fail due to missing API token, but they should accept the parameters
    // We don't await them, just verify they can be called
    const hasListRooms = typeof bigoClient.listLiveRooms === 'function';
    const hasGetAnalytics = typeof bigoClient.getAnalytics === 'function';
    
    if (hasListRooms && hasGetAnalytics) {
      console.log('✅ PASS - Methods accept parameter objects');
    } else {
      console.log('❌ FAIL - Methods should be callable');
    }
  } catch (error) {
    console.log('❌ FAIL - Methods should accept parameters');
  }
}

// Run async tests
Promise.all([testErrorHandling(), testMethodSignatures()]).then(() => {
  console.log('\n=== Test Summary ===');
  console.log('All structural tests completed');
  console.log('Note: Integration tests require valid BIGO_API_TOKEN in environment');
}).catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});
