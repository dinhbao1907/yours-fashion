const axios = require('axios');

async function testOrderCreation() {
  try {
    console.log('Testing order creation...');
    
    const testOrder = {
      amount: 150000,
      productTotal: 125000,
      shippingFee: 25000,
      description: 'Test order creation',
      orderCode: Date.now(),
      returnUrl: 'http://localhost:5000/signup-login-system/payment-success.html',
      customer: {
        email: 'test@example.com',
        name: 'Test User',
        phone: '0123456789',
        address: 'Test Address',
        username: 'testuser'
      },
      items: [
        {
          type: 'custom-design',
          designType: 'TSHIRT',
          color: 'BLACK',
          size: 'M',
          quantity: 1,
          designImage: 'test-image',
          designElements: [],
          notes: 'Test custom design'
        }
      ]
    };

    console.log('Sending test order:', JSON.stringify(testOrder, null, 2));
    
    const response = await axios.post('http://localhost:5000/api/create-payos-order', testOrder, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Order creation successful!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('Order creation failed:');
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testOrderCreation(); 