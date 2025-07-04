const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  designId: { type: String, required: true },
  username: { type: String, required: true },
  avatar: { type: String },
  rating: { type: Number, required: true },
  feedback: { type: String, required: true },
  color: String,
  size: String,
  descriptionMatch: String,
  material: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema); 