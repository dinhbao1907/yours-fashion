const mongoose = require('mongoose');
const Review = require('./models/Review');
const Customer = require('./models/Customer');
const Designer = require('./models/Designer');
require('dotenv').config();

const DEFAULT_AVATAR = 'resources/user-circle.png';

async function getUserAvatar(username) {
  let user = await Customer.findOne({ username });
  if (user && user.avatar) return user.avatar;
  user = await Designer.findOne({ username });
  if (user && user.avatar) return user.avatar;
  return DEFAULT_AVATAR;
}

async function forceUpdateAllReviewsAvatar() {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const reviews = await Review.find({});
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

forceUpdateAllReviewsAvatar(); 