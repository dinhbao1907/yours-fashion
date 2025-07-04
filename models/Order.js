const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  productId: String,
  name: String,
  image: String,
  price: Number,
  quantity: Number,
  size: String,
});

const customDesignSchema = new mongoose.Schema({
  designType: { type: String, enum: ['TSHIRT', 'HOODIE', 'POLO', 'tshirt', 'hoodie', 'polo'], required: true },
  designImage: String, // Base64 or URL of the design
  designElements: [{
    type: { type: String, enum: ['text', 'image', 'pattern'] },
    content: String,
    x: Number,
    y: Number,
    width: Number,
    height: Number,
    color: String
  }],
  material: { type: String, default: 'Vải Cotton' },
  color: String,
  size: String,
  quantity: { type: Number, default: 1 },
  specialInstructions: String,
});

const orderSchema = new mongoose.Schema({
  orderCode: { type: String, required: true, unique: true },
  orderType: { 
    type: String, 
    enum: ['product_purchase', 'custom_design', 'mixed'], 
    default: 'product_purchase',
    required: true 
  },
  amount: { type: Number, required: true }, // Total amount (productTotal + shippingFee) - kept for backward compatibility
  productTotal: { type: Number, required: true }, // Product subtotal (excluding shipping fee)
  shippingFee: { type: Number, default: 0 }, // Shipping fee
  status: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'CANCELED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'DESIGN_REJECTED'], 
    default: 'PENDING' 
  },
  username: { type: String },
  customer: {
    username: String,
    email: String,
    name: String,
    phone: String,
    address: String,
  },
  // For product purchases (designer products)
  items: [orderItemSchema],
  // For custom design orders
  customDesign: customDesignSchema,
  // Designer info for product purchases
  designer: {
    username: String,
    name: String,
    email: String,
  },
  payos: {
    paymentRequestId: String,
    checkoutUrl: String,
    transactionId: String,
    raw: Object,
  },
  notes: String, // Admin notes
  // Add payout status for designer
  designerPayoutStatus: {
    type: String,
    enum: ['unpaid', 'paid'],
    default: 'unpaid',
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const PAID_STATUSES = ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'];
module.exports.PAID_STATUSES = PAID_STATUSES;

module.exports = mongoose.model('Order', orderSchema); 