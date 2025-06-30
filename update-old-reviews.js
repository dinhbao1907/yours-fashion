const mongoose = require('mongoose');
const Review = require('./models/Review');
require('dotenv').config();

const DEFAULT_AVATAR = 'resources/user-circle.png';

async function updateOldReviews() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const result = await Review.updateMany(
    { $or: [{ avatar: { $exists: false } }, { avatar: null }, { avatar: '' }] },
    { $set: { avatar: DEFAULT_AVATAR } }
  );
  console.log('Updated reviews:', result.modifiedCount || result.nModified || 0);
  mongoose.disconnect();
}

updateOldReviews(); 