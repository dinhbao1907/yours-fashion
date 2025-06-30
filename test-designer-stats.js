const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test designer login first to get token
async function testDesignerLogin() {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/signin-designer`, {
      username: 'test_designer',
      password: 'Test123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Designer login successful');
    return token;
  } catch (error) {
    console.error('❌ Designer login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test get designer stats
async function testGetDesignerStats(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/designer/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get designer stats successful');
    console.log('📊 Stats data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Get designer stats failed:', error.response?.data || error.message);
    return null;
  }
}

// Test get designer transactions
async function testGetDesignerTransactions(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/designer/transactions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get designer transactions successful');
    console.log('📋 Transactions:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Get designer transactions failed:', error.response?.data || error.message);
    return null;
  }
}

// Test withdrawal request
async function testWithdrawalRequest(token) {
  try {
    const withdrawalData = {
      method: 'momo',
      accountInfo: '0901234567',
      accountName: 'Test Designer',
      amount: 100000
    };
    
    const response = await axios.post(`${BASE_URL}/api/designer/withdraw`, withdrawalData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Withdrawal request successful');
    console.log('💰 Withdrawal result:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Withdrawal request failed:', error.response?.data || error.message);
    return null;
  }
}

// Test admin withdrawal management
async function testAdminWithdrawalManagement() {
  try {
    // First, authenticate as admin
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    const adminToken = adminLoginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Get withdrawal stats
    const statsResponse = await axios.get(`${BASE_URL}/api/admin/withdrawal-stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('✅ Get withdrawal stats successful');
    console.log('📊 Withdrawal stats:', JSON.stringify(statsResponse.data, null, 2));
    
    // Get all withdrawals
    const withdrawalsResponse = await axios.get(`${BASE_URL}/api/admin/withdrawals`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    
    console.log('✅ Get withdrawals successful');
    console.log('📋 Withdrawals:', JSON.stringify(withdrawalsResponse.data, null, 2));
    
    return { stats: statsResponse.data, withdrawals: withdrawalsResponse.data };
  } catch (error) {
    console.error('❌ Admin withdrawal management failed:', error.response?.data || error.message);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Designer Stats & Withdrawal System...\n');
  
  // Test designer functionality
  const designerToken = await testDesignerLogin();
  if (!designerToken) {
    console.log('❌ Cannot proceed without designer token');
    return;
  }
  
  // Test designer stats
  const stats = await testGetDesignerStats(designerToken);
  
  // Test designer transactions
  await testGetDesignerTransactions(designerToken);
  
  // Test withdrawal request (only if there's available amount)
  if (stats && stats.availableAmount >= 100000) {
    await testWithdrawalRequest(designerToken);
  } else {
    console.log('⚠️ Skipping withdrawal test - insufficient available amount');
  }
  
  // Test admin functionality
  await testAdminWithdrawalManagement();
  
  console.log('\n🎉 Designer Stats & Withdrawal tests completed!');
}

runTests().catch(console.error); 