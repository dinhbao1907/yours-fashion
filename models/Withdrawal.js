const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
  },
  designerUsername: {
    type: String,
    required: true,
    index: true,
  },
  method: {
    type: String,
    required: true,
    enum: ['momo', 'zalopay', 'bank'],
  },
  accountInfo: {
    type: String,
    required: true,
  },
  accountName: {
    type: String,
    required: true,
  },
  bankName: {
    type: String,
    default: '', // Bank name for bank transfers
  },
  amount: {
    type: Number,
    required: true,
    min: 50000, // Minimum 50,000 VND
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  processedBy: {
    type: String, // Admin username who processed the withdrawal
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  },
  paymentImage: {
    type: String, // base64 image string
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
withdrawalSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Withdrawal', withdrawalSchema); 