const axios = require('axios');

async function testOrdersAPI() {
  try {
    // First, authenticate as admin
    console.log('Authenticating as admin...');
    const loginResponse = await axios.post('http://localhost:5000/api/admin/signin', {
      username: 'greengreen',
      password: 'yoursdesign'
    });
    
    const adminToken = loginResponse.data.token;
    console.log('Admin authentication successful');
    
    // Set up headers with admin token
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    // Get admin stats
    console.log('\nTesting admin stats...');
    const statsResponse = await axios.get('http://localhost:5000/api/admin/stats', { headers });
    console.log('Stats:', statsResponse.data);
    
    // Get all orders
    console.log('\nTesting admin orders API...');
    const ordersResponse = await axios.get('http://localhost:5000/api/admin/orders', { headers });
    console.log('Orders count:', ordersResponse.data.length);
    
    // Display first few orders with designer info
    ordersResponse.data.slice(0, 5).forEach((order, index) => {
      console.log(`\nOrder ${index + 1}:`);
      console.log('  ID:', order.id);
      console.log('  Order Code:', order.orderCode);
      console.log('  Order Type:', order.orderType);
      console.log('  Customer:', order.customer?.name || order.customer?.username || 'N/A');
      console.log('  Designer:', order.designer?.name || order.designer?.username || 'N/A');
      console.log('  Status:', order.status);
      console.log('  Amount:', order.amount);
      console.log('  Items count:', order.items?.length || 0);
      if (order.items && order.items.length > 0) {
        console.log('  First item productId:', order.items[0].productId);
      }
    });
    
  } catch (error) {
    console.error('Error testing orders API:', error.response?.data || error.message);
  }
}

testOrdersAPI(); 