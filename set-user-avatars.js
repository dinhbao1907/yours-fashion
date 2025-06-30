const mongoose = require('mongoose');
const Customer = require('./models/Customer');
const Designer = require('./models/Designer');
require('dotenv').config();

const DEFAULT_AVATAR = 'resources/user-circle.png';

async function setAvatarsForUsers() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  // Update Customers
  const customers = await Customer.find({ $or: [{ avatar: { $exists: false } }, { avatar: null }, { avatar: '' }] });
  let updatedCustomers = 0;
  for (const user of customers) {
    // Example: use a username-based avatar path, or fallback to default
    user.avatar = `resources/${user.username}-avatar.png`;
    await user.save();
    updatedCustomers++;
    console.log(`Set avatar for customer: ${user.username}`);
  }

  // Update Designers
  const designers = await Designer.find({ $or: [{ avatar: { $exists: false } }, { avatar: null }, { avatar: '' }] });
  let updatedDesigners = 0;
  for (const user of designers) {
    user.avatar = `resources/${user.username}-avatar.png`;
    await user.save();
    updatedDesigners++;
    console.log(`Set avatar for designer: ${user.username}`);
  }

  console.log('Total customers updated:', updatedCustomers);
  console.log('Total designers updated:', updatedDesigners);
  mongoose.disconnect();
}

setAvatarsForUsers(); 