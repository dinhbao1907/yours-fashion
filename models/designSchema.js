const mongoose = require('mongoose');

const designElementSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'image', 'pattern'], required: true },
  content: { type: String, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  color: { type: String, default: '#000000' }
});

const designSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Xóa ref để linh hoạt
  username: { type: String, required: true }, // Designer username
  name: { type: String, required: true },     // Design name
  designId: { type: String, unique: true, required: true },
  productType: { type: String, enum: ['Áo T-shirt', 'Áo Hoodie'], required: true },
  material: { type: String, default: 'Vải Cotton' },
  color: { type: String, required: true },
  price: { type: Number, required: true },
  productCode: { type: String, unique: true, required: true },
  description: { type: String, default: '' },
  designElements: [designElementSchema],
  designImage: { type: String }, // Base64 encoded image
  isCustomDesign: { type: Boolean, default: false }, // Flag to identify custom designs
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  likes: { type: Number, default: 0 }, // Number of likes
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'draft'], default: 'pending' },
  rejectionReason: { type: String, default: '' },
  modifiedFields: { type: [String], default: [] },
});

designSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Design', designSchema);