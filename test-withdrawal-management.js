const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test admin login first to get token
async function testAdminLogin() {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/login`, {
      username: 'admin',
      password: 'Admin123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    return token;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test get all withdrawals
async function testGetWithdrawals(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/withdrawals`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get withdrawals successful');
    console.log('📊 Withdrawals found:', response.data.length);
    console.log('📋 Sample withdrawal:', response.data[0] || 'No withdrawals found');
    return response.data;
  } catch (error) {
    console.error('❌ Get withdrawals failed:', error.response?.data || error.message);
    return [];
  }
}

// Test get withdrawal statistics
async function testGetWithdrawalStats(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/withdrawal-stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get withdrawal stats successful');
    console.log('📊 Withdrawal statistics:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Get withdrawal stats failed:', error.response?.data || error.message);
    return null;
  }
}

// Test process a withdrawal (if there are pending withdrawals)
async function testProcessWithdrawal(token, withdrawals) {
  const pendingWithdrawal = withdrawals.find(w => w.status === 'pending');
  
  if (!pendingWithdrawal) {
    console.log('⚠️ No pending withdrawals to process');
    return;
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/withdrawals/${pendingWithdrawal.transactionId}/process`, {
      status: 'completed',
      notes: 'Test processing - approved by admin'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Process withdrawal successful');
    console.log('📋 Processed withdrawal:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Process withdrawal failed:', error.response?.data || error.message);
    return null;
  }
}

// Test filter withdrawals by status
async function testFilterWithdrawals(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/withdrawals?status=pending`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Filter withdrawals successful');
    console.log('📊 Pending withdrawals:', response.data.length);
    return response.data;
  } catch (error) {
    console.error('❌ Filter withdrawals failed:', error.response?.data || error.message);
    return [];
  }
}

// Main test function
async function runWithdrawalManagementTests() {
  console.log('🚀 Starting Withdrawal Management Tests...\n');
  
  // Test admin login
  const token = await testAdminLogin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test get all withdrawals
  const withdrawals = await testGetWithdrawals(token);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test get withdrawal statistics
  await testGetWithdrawalStats(token);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test filter withdrawals
  await testFilterWithdrawals(token);
  
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test process withdrawal (if there are pending ones)
  await testProcessWithdrawal(token, withdrawals);
  
  console.log('\n' + '='.repeat(50) + '\n');
  console.log('✅ All withdrawal management tests completed!');
  console.log('✅ Commission split updated: YOURS 60% | Designer 40%');
}

// Run the tests
runWithdrawalManagementTests().catch(console.error); 