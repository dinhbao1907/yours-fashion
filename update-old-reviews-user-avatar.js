const mongoose = require('mongoose');
const Review = require('./models/Review');
const Customer = require('./models/Customer');
const Designer = require('./models/Designer');
require('dotenv').config();

const DEFAULT_AVATAR = 'resources/user-circle.png';

async function getUserAvatar(username) {
  // Try to find in Customer
  let user = await Customer.findOne({ username });
  if (user && user.avatar) return user.avatar;
  // Try to find in Designer
  user = await Designer.findOne({ username });
  if (user && user.avatar) return user.avatar;
  // Fallback
  return DEFAULT_AVATAR;
}

async function updateOldReviewsWithUserAvatar() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const reviews = await Review.find({ $or: [{ avatar: { $exists: false } }, { avatar: null }, { avatar: '' }] });
  let updated = 0;
  for (const review of reviews) {
    const avatar = await getUserAvatar(review.username);
    review.avatar = avatar;
    await review.save();
    updated++;
    console.log(`Updated review by ${review.username} with avatar: ${avatar}`);
  }
  console.log('Total reviews updated:', updated);
  mongoose.disconnect();
}

updateOldReviewsWithUserAvatar(); 