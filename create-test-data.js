const mongoose = require('mongoose');
require('dotenv').config();

const Customer = require('./models/Customer');
const Designer = require('./models/Designer');
const Order = require('./models/Order');
const Design = require('./models/designSchema');
const bcrypt = require('bcryptjs');

async function createTestData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create test customer
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const customer = new Customer({
      username: 'test_customer',
      email: 'customer@test.com',
      password: hashedPassword,
      name: 'Nguyễn Văn Test',
      phone: '0901234567',
      gender: 'Nam',
      isVerified: true
    });
    await customer.save();
    console.log('✅ Test customer created');

    // Create test designer
    const designer = new Designer({
      username: 'test_designer',
      email: 'designer@test.com',
      password: hashedPassword,
      name: 'Trần Thị Designer',
      phone: '0909876543',
      gender: 'Nữ',
      isVerified: true
    });
    await designer.save();
    console.log('✅ Test designer created');

    // Create test design
    const design = new Design({
      userId: designer._id,
      username: 'test_designer',
      name: 'Test T-shirt Design',
      designId: 'TEST001',
      productType: 'Áo T-shirt',
      material: 'Vải Cotton',
      color: 'Trắng',
      price: 150000,
      productCode: 'TSHIRT001',
      description: 'Thiết kế test cho admin dashboard',
      designElements: [
        {
          type: 'text',
          content: 'TEST DESIGN',
          x: 50,
          y: 50,
          width: 100,
          height: 20,
          color: '#7B3FF2'
        }
      ],
      designImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+VGVzdCBEZXNpZ248L3RleHQ+Cjwvc3ZnPgo=',
      isCustomDesign: true, // This is a custom design
      status: 'approved'
    });
    await design.save();
    console.log('✅ Test design created');

    // Create test regular design (non-custom)
    const regularDesign = new Design({
      userId: designer._id,
      username: 'test_designer',
      name: 'Regular Hoodie Design',
      designId: 'TEST002',
      productType: 'Áo Hoodie',
      material: 'Vải Cotton',
      color: 'Đen',
      price: 200000,
      productCode: 'HOODIE001',
      description: 'Thiết kế hoodie thường',
      designElements: [], // No design elements = not custom
      designImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRkZGRkZGIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPgo8dGV4dCB4PSIxMDAiIHk9IjEwMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSIjMzMzIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+UmVndWxhciBEZXNpZ248L3RleHQ+Cjwvc3ZnPgo=',
      isCustomDesign: false, // This is not a custom design
      status: 'approved'
    });
    await regularDesign.save();
    console.log('✅ Test regular design created');

    // Create test order
    const order = new Order({
      orderCode: 'TEST001',
      orderType: 'product_purchase',
      amount: 150000,
      customer: {
        username: 'test_customer',
        name: 'Nguyễn Văn Test',
        email: 'customer@test.com',
        phone: '0901234567'
      },
      designer: {
        username: 'test_designer',
        name: 'Trần Thị Designer',
        email: 'designer@test.com'
      },
      items: [
        {
          productId: design._id,
          name: 'Test T-shirt Design',
          image: design.designImage,
          price: 150000,
          quantity: 1,
          size: 'M'
        }
      ],
      status: 'PAID',
      username: 'test_customer'
    });
    await order.save();
    console.log('✅ Test order created');

    console.log('\n🎉 Test data created successfully!');
    console.log('You can now test your admin dashboard with this data.');

  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTestData(); 