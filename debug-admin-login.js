const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://greengreen:greengreen@yours.z8ipvvb.mongodb.net/?retryWrites=true&w=majority&appName=YOURS";

async function debugAdmin() {
  await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const username = 'greengreen1';
  const testPassword = 'yoursdesign!';
  const admin = await Admin.findOne({ username });
  if (!admin) {
    console.log('Admin not found');
    process.exit(1);
  }
  console.log('Admin document:', admin);
  console.log('Password hash in DB:', admin.password);
  const isMatch = await bcrypt.compare(testPassword, admin.password);
  console.log('Does bcrypt.compare("yoursdesign!", hash) return:', isMatch);
  process.exit(0);
}

debugAdmin().catch(err => { console.error(err); process.exit(1); }); 