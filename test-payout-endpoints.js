const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test admin login first to get token
async function testAdminLogin() {
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/admin/signin`, {
      username: 'greengreen',
      password: 'yoursdesign'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    return token;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return null;
  }
}

// Test get designer payouts
async function testGetDesignerPayouts(token) {
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/designer-payouts`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Get designer payouts successful');
    console.log('📊 Payout data:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Get designer payouts failed:', error.response?.data || error.message);
    return null;
  }
}

// Test pay designer (if there are unpaid designers)
async function testPayDesigner(token, designerUsername) {
  try {
    const response = await axios.post(`${BASE_URL}/api/admin/designer-payouts/${designerUsername}/pay`, {}, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Pay designer successful');
    console.log('💰 Payment result:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Pay designer failed:', error.response?.data || error.message);
    return null;
  }
}

// Run tests
async function runTests() {
  console.log('🧪 Testing Designer Payout Endpoints...\n');
  
  // Test admin login
  const token = await testAdminLogin();
  if (!token) {
    console.log('❌ Cannot proceed without admin token');
    return;
  }
  
  // Test get payouts
  const payouts = await testGetDesignerPayouts(token);
  if (payouts && payouts.length > 0) {
    // Find first unpaid designer
    const unpaidDesigner = payouts.find(p => p.payoutStatus === 'unpaid');
    if (unpaidDesigner) {
      console.log(`\n💰 Testing payment for designer: ${unpaidDesigner.username}`);
      await testPayDesigner(token, unpaidDesigner.username);
    } else {
      console.log('\n✅ All designers are already paid!');
    }
  }
  
  console.log('\n🎉 Payout endpoint tests completed!');
}

runTests().catch(console.error); 