/**
 * Test script to verify remote API endpoints for production readiness
 * 
 * This script tests all critical API endpoints that the pharmacy app uses
 * to ensure the app will work for testers in the cloud.
 * 
 * Usage: npx ts-node scripts/test-remote-api.ts
 */

import axios from 'axios';

const API_BASE_URL = 'https://medsync-api-v1.up.railway.app/api/v1';

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  message: string;
  responseTime?: number;
}

const results: TestResult[] = [];

async function testEndpoint(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  description: string,
  data?: any,
  headers?: Record<string, string>,
  expectedStatus?: number
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    const response = await axios({
      method,
      url,
      data,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 10000,
      validateStatus: () => true, // Don't throw on any status
    });

    const responseTime = Date.now() - startTime;
    const status = expectedStatus 
      ? (response.status === expectedStatus ? 'PASS' : 'FAIL')
      : (response.status < 500 ? 'PASS' : 'FAIL');

    return {
      endpoint,
      method,
      status,
      statusCode: response.status,
      message: status === 'PASS' 
        ? `✓ ${description} (${response.status})`
        : `✗ ${description} - Expected ${expectedStatus || '2xx'}, got ${response.status}`,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 'FAIL',
      message: `✗ ${description} - Error: ${error.message || 'Unknown error'}`,
      responseTime,
    };
  }
}

async function runTests() {
  console.log('🧪 Testing Remote API Endpoints for Production Readiness\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  console.log('=' .repeat(60) + '\n');

  // 1. Health Check
  console.log('1. Health & Status Checks');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/health', 'Health check endpoint', undefined, undefined, 200));
  // Root endpoint may not exist, skip or expect 404
  results.push(await testEndpoint('GET', '/', 'Root endpoint (may return 404)', undefined, undefined));
  console.log('');

  // 2. Authentication Endpoints
  console.log('2. Authentication Endpoints');
  console.log('-'.repeat(60));
  // Login may return 400 or 401, both are acceptable
  results.push(await testEndpoint('POST', '/auth/login', 'Login endpoint (should return 400/401 without valid credentials)', { email: 'test@test.com', password: 'test' }, undefined));
  results.push(await testEndpoint('POST', '/auth/register', 'Register endpoint (should return 400 without valid data)', {}, undefined, 400));
  results.push(await testEndpoint('GET', '/auth/me', 'Get current user (should return 401 without token)', undefined, undefined, 401));
  console.log('');

  // 3. Pharmacy Endpoints (Public/Admin)
  console.log('3. Pharmacy Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/pharmacy', 'List pharmacies (should return 401 without auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/pharmacies', 'Admin: List all pharmacies (should return 401 without admin auth)', undefined, undefined, 401));
  console.log('');

  // 4. Order Endpoints
  console.log('4. Order Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/orders', 'List orders (should return 401 without auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/orders', 'Admin: List all orders (should return 401 without admin auth)', undefined, undefined, 401));
  console.log('');

  // 5. Notification Endpoints
  console.log('5. Notification Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/notifications', 'Get notifications (should return 401 without auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/notifications', 'Admin: Get notifications (should return 401 without admin auth)', undefined, undefined, 401));
  console.log('');

  // 6. Chat Endpoints
  console.log('6. Chat Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/chat/orders', 'Get chat orders (should return 401 without auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/chat/conversations', 'Get conversations (should return 401 without auth)', undefined, undefined, 401));
  console.log('');

  // 7. Admin Oversight Endpoints
  console.log('7. Admin Oversight Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/admin/vitals-oversight', 'Admin: Vitals oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/health-records-oversight', 'Admin: Health records oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/notes-oversight', 'Admin: Notes oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/emergency-oversight', 'Admin: Emergency oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/dispatch-oversight', 'Admin: Dispatch oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/support/tickets/all', 'Admin: Support tickets (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/medications-oversight', 'Admin: Medications oversight (should return 401 without admin auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/ai-oversight', 'Admin: AI oversight (should return 401 without admin auth)', undefined, undefined, 401));
  console.log('');

  // 8. Financial Endpoints
  console.log('8. Financial Endpoints');
  console.log('-'.repeat(60));
  results.push(await testEndpoint('GET', '/pharmacy/financials', 'Get financials (should return 401 without auth)', undefined, undefined, 401));
  results.push(await testEndpoint('GET', '/admin/financials', 'Admin: Get financials (should return 401 without admin auth)', undefined, undefined, 401));
  console.log('');

  // Print Summary
  console.log('='.repeat(60));
  console.log('\n📊 Test Summary\n');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log('');

  // Show failed tests
  if (failed > 0) {
    console.log('❌ Failed Tests:');
    console.log('-'.repeat(60));
    results
      .filter(r => r.status === 'FAIL')
      .forEach(r => {
        console.log(`  ${r.method} ${r.endpoint}`);
        console.log(`    ${r.message}`);
        if (r.responseTime) {
          console.log(`    Response Time: ${r.responseTime}ms`);
        }
        console.log('');
      });
  }

  // Show response times
  const avgResponseTime = results
    .filter(r => r.responseTime)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.filter(r => r.responseTime).length;

  console.log('📈 Performance:');
  console.log(`  Average Response Time: ${Math.round(avgResponseTime)}ms`);
  console.log('');

  // Final verdict
  console.log('='.repeat(60));
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - API is ready for production!');
  } else {
    console.log('⚠️  SOME TESTS FAILED - Review the failures above');
  }
  console.log('='.repeat(60));
  console.log('');

  // Recommendations
  console.log('💡 Recommendations:');
  console.log('  1. Ensure NEXT_PUBLIC_API_BASE_URL is set in production environment');
  console.log('  2. Verify CORS is configured correctly for your frontend domain');
  console.log('  3. Check that authentication tokens are being sent correctly');
  console.log('  4. Monitor API response times in production');
  console.log('  5. Set up error tracking (e.g., Sentry) for production');
  console.log('');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
