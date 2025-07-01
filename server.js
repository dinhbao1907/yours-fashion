const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require('dotenv').config();
console.log('MONGODB_URI:', process.env.MONGODB_URI); // Thêm log để kiểm tra
const {
  sendRegistrationEmail,
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendDesignApprovedEmail,
  sendDesignRejectedEmail,
  sendWithdrawalCompletedEmail,
  sendWithdrawalFailedEmail,
  sendOrderPaidEmail,
  sendOrderDeliveringEmail,
  sendOrderDeliveredEmail,
  sendBanEmail,
  sendUnbanEmail,
  sendCustomDesignApprovedEmail,
  sendCustomDesignRejectedEmail
} = require("./utils/emailService");
const Design = require('./models/designSchema'); // Import schema
const path = require('path');
const Review = require('./models/Review');
const axios = require('axios');
const crypto = require('crypto'); // Add at the top with other requires
const Customer = require("./models/Customer");
const Designer = require("./models/Designer");
const Order = require("./models/Order");
const Notification = require("./models/Notification");
const Admin = require("./models/Admin");
const Withdrawal = require("./models/Withdrawal");

const app = express();
// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Kiểm tra MONGODB_URI
const mongodbUri = process.env.MONGODB_URI;
if (!mongodbUri) {
  console.error("MONGODB_URI is not defined in .env file. Please set it.");
  process.exit(1);
}

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })
  .then(async () => {
    console.log("Connected to MongoDB successfully");
    
    // Create default admin account
    await createDefaultAdmin();
    
    app.listen(process.env.PORT || 5000, () => {
      console.log(`Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Không tìm thấy token, yêu cầu đăng nhập' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
  }
};

// Middleware kiểm tra token
const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ message: "Không có token, vui lòng đăng nhập" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res
      .status(403)
      .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Hàm kiểm tra độ mạnh mật khẩu
const isStrongPassword = (password) => {
  const minLength = 6;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[$#@+\-=?!]/.test(password);
  return (
    password.length >= minLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar
  );
};

// API Đăng ký Customer
app.post("/api/signup-customer", async (req, res) => {
  try {
    const {
      username,
      email: rawEmail,
      password,
      confirmPassword,
      name,
      phone,
      gender,
      dob,
    } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, chữ số, và ký tự đặc biệt ($,#,@,+,-,=,?,!).",
      });
    }

    const existingDesigner = await Designer.findOne({ email });
    if (existingDesigner) {
      return res
        .status(400)
        .json({ message: "Email đã được đăng ký" });
    }

    const existingDesignerWithUsername = await Designer.findOne({ username });
    if (existingDesignerWithUsername) {
      return res
        .status(400)
        .json({ message: "Tên đăng nhập đã được sử dụng" });
    }

    const existingCustomer = await Customer.findOne({
      $or: [{ email }, { username }],
    });
    if (existingCustomer) {
      return res
        .status(400)
        .json({ message: "Email hoặc tên đăng nhập đã được đăng ký" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated verification code for Customer:", verificationCode);

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

    const customer = new Customer({
      username,
      email,
      password: hashedPassword,
      name,
      phone,
      gender,
      dob: dob ? new Date(dob) : undefined,
      isVerified: false,
      verificationCode,
      verificationCodeExpiry,
    });

    const savedCustomer = await customer.save();
    console.log(
      "Saved customer with verification code:",
      savedCustomer.verificationCode
    );

    // Create notification for new customer registration
    await createNotification(
      'new-customer',
      'Khách hàng mới đăng ký',
      `Khách hàng ${name} (${email}) vừa đăng ký tài khoản mới`,
      { customerId: savedCustomer._id, email, name },
      'medium'
    );

    try {
      await sendVerificationEmail(email, username, verificationCode);
      console.log("Verification email sent successfully for Customer");
    } catch (emailError) {
      console.error("Error sending verification email for Customer:", emailError);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(201).json({
      message:
        "Bạn đã đăng ký tài khoản thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản của bạn.",
      isVerified: false,
      email: email,
    });
  } catch (error) {
    console.error("Error in signup-customer:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Đăng ký Designer
app.post("/api/signup-designer", async (req, res) => {
  try {
    const {
      username,
      email: rawEmail,
      password,
      confirmPassword,
      name,
      phone,
      gender,
      dob,
    } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, chữ số, và ký tự đặc biệt ($,#,@,+,-,=,?,!).",
      });
    }

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return res
        .status(400)
        .json({ message: "Email đã được đăng ký" });
    }

    const existingCustomerWithUsername = await Customer.findOne({ username });
    if (existingCustomerWithUsername) {
      return res
        .status(400)
        .json({ message: "Tên đăng nhập đã được sử dụng" });
    }

    const existingDesigner = await Designer.findOne({
      $or: [{ email }, { username }],
    });
    if (existingDesigner) {
      return res
        .status(400)
        .json({ message: "Email hoặc tên đăng nhập đã được đăng ký" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated verification code for Designer:", verificationCode);

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

    const designer = new Designer({
      username,
      email,
      password: hashedPassword,
      name,
      phone,
      gender,
      dob: dob ? new Date(dob) : undefined,
      isVerified: false,
      verificationCode,
      verificationCodeExpiry,
    });

    const savedDesigner = await designer.save();
    console.log(
      "Saved designer with verification code:",
      savedDesigner.verificationCode
    );

    // Create notification for new designer registration
    await createNotification(
      'new-customer',
      'Designer mới đăng ký',
      `Designer ${name} (${email}) vừa đăng ký tài khoản mới`,
      { designerId: savedDesigner._id, email, name },
      'high'
    );

    try {
      await sendVerificationEmail(email, username, verificationCode);
      console.log("Verification email sent successfully for Designer");
    } catch (emailError) {
      console.error("Error sending verification email for Designer:", emailError);
      return res.status(500).json({ message: "Failed to send verification email" });
    }

    res.status(201).json({
      message:
        "Bạn đã đăng ký tài khoản thành công. Vui lòng kiểm tra email của bạn để xác thực tài khoản của bạn.",
      isVerified: false,
      email: email,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Đăng nhập Customer
app.post("/api/signin-customer", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const usernameOrEmailLower = usernameOrEmail
      ? usernameOrEmail.toLowerCase()
      : null;

    const customer = await Customer.findOne({
      $or: [
        { email: usernameOrEmailLower },
        { username: usernameOrEmailLower },
      ]
    });
    if (!customer) {
      return res
        .status(400)
        .json({ message: "Sai username/email hoặc mật khẩu" });
    }

    // Check if account is deleted
    if (customer.isDeleted) {
      return res.status(403).json({
        message: "Tài khoản đã bị xóa vĩnh viễn",
      });
    }

    // Check if account is banned
    if (customer.isBanned) {
      const now = new Date();
      if (!customer.banExpiry || customer.banExpiry > now) {
        // Still banned
        let banMessage = "Tài khoản đã bị cấm";
        if (customer.banReason) {
          banMessage += `: ${customer.banReason}`;
        }
        if (customer.banExpiry) {
          const daysLeft = Math.ceil((customer.banExpiry - now) / (1000 * 60 * 60 * 24));
          banMessage += ` (Còn ${daysLeft} ngày)`;
        } else {
          banMessage += " (Vĩnh viễn)";
        }
        return res.status(403).json({
          message: banMessage,
        });
      }
    }

    const isMatch = await bcrypt.compare(password, customer.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Sai username/email hoặc mật khẩu" });
    }

    if (!customer.isVerified) {
      return res.status(403).json({
        message: "Please verify your account trước đó",
        isVerified: false,
        email: customer.email,
      });
    }

    const token = jwt.sign(
      { id: customer._id, role: "customer", username: customer.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      token,
      message: "Đăng nhập thành công",
      isVerified: true,
      username: customer.username,
      name: customer.name || '',
      email: customer.email || ''
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Đăng nhập Designer
app.post("/api/signin-designer", async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const usernameOrEmailLower = usernameOrEmail
      ? usernameOrEmail.toLowerCase()
      : null;

    const designer = await Designer.findOne({
      $or: [
        { email: usernameOrEmailLower },
        { username: usernameOrEmailLower },
      ]
    });
    if (!designer) {
      return res
        .status(400)
        .json({ message: "Sai username/email hoặc mật khẩu" });
    }

    // Check if account is deleted
    if (designer.isDeleted) {
      return res.status(403).json({
        message: "Tài khoản đã bị xóa vĩnh viễn",
      });
    }

    // Check if account is banned
    if (designer.isBanned) {
      const now = new Date();
      if (!designer.banExpiry || designer.banExpiry > now) {
        // Still banned
        let banMessage = "Tài khoản đã bị cấm";
        if (designer.banReason) {
          banMessage += `: ${designer.banReason}`;
        }
        if (designer.banExpiry) {
          const daysLeft = Math.ceil((designer.banExpiry - now) / (1000 * 60 * 60 * 24));
          banMessage += ` (Còn ${daysLeft} ngày)`;
        } else {
          banMessage += " (Vĩnh viễn)";
        }
        return res.status(403).json({
          message: banMessage,
        });
      }
    }

    const isMatch = await bcrypt.compare(password, designer.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({ message: "Sai username/email hoặc mật khẩu" });
    }

    if (!designer.isVerified) {
      return res.status(403).json({
        message: "Please verify your account trước đó",
        isVerified: false,
        email: designer.email,
      });
    }

    const token = jwt.sign(
      { id: designer._id, role: "designer", username: designer.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({
      token,
      message: "Đăng nhập thành công",
      isVerified: true,
      username: designer.username,
      name: designer.name || '',
      email: designer.email || ''
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Đăng nhập Admin
app.post("/api/admin/signin", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Username và password là bắt buộc" });
    }

    const admin = await Admin.findOne({ username: username.toLowerCase() });
    if (!admin) {
      return res.status(400).json({ message: "Sai username hoặc password" });
    }

    // Check if admin account is active
    if (!admin.isActive) {
      return res.status(403).json({ message: "Tài khoản admin đã bị vô hiệu hóa" });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Sai username hoặc password" });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    const token = jwt.sign(
      { 
        id: admin._id, 
        role: "admin", 
        username: admin.username,
        permissions: admin.permissions 
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" } // Longer session for admin
    );

    res.json({
      token,
      message: "Đăng nhập admin thành công",
      admin: {
        username: admin.username,
        name: admin.name,
        role: admin.role,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error("Admin signin error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Lấy thông tin admin
app.get("/api/admin/profile", verifyToken, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }

    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    res.json({ admin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Middleware kiểm tra quyền admin
const adminAuthMiddleware = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Không có token, vui lòng đăng nhập" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin only." });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
  }
};

// Function to create default admin account
async function createDefaultAdmin() {
  try {
    const existingAdmin = await Admin.findOne({ username: 'greengreen' });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('yoursdesign', 10);
      const admin = new Admin({
        username: 'greengreen',
        password: hashedPassword,
        name: 'Admin YOURS',
        email: 'admin@yours.com',
        role: 'admin',
        permissions: {
          manageUsers: true,
          manageDesigns: true,
          manageOrders: true,
          manageSettings: true,
          viewAnalytics: true
        }
      });
      await admin.save();
      console.log('Default admin account created');
    }
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
}

// Create demo designs for testing
async function createDemoDesigns() {
  try {
    // Check if demo designs already exist
    const existingDemo = await Design.findOne({ name: { $regex: /^DEMO/ } });
    if (existingDemo) {
      console.log('Demo designs already exist, skipping...');
      return;
    }

    // Create demo designs
    const demoDesigns = [
      {
        userId: new mongoose.Types.ObjectId(),
        designId: 'DEMO_DESIGN_001',
        name: 'DEMO - Urban Street Style',
        productType: 'Áo T-shirt',
        material: 'Vải Cotton',
        color: 'Trắng',
        price: 180000,
        productCode: 'DEMO001',
        description: 'Thiết kế áo thun phong cách street art với họa tiết graffiti độc đáo',
        designImage: 'https://via.placeholder.com/300x300/7B3FF2/FFFFFF?text=Urban+Street+Style',
        username: 'demo_designer',
        status: 'pending',
        isCustomDesign: true,
        designElements: [
          {
            type: 'text',
            content: 'URBAN STYLE',
            x: 50,
            y: 50,
            width: 120,
            height: 30,
            color: '#7B3FF2'
          }
        ]
      },
      {
        userId: new mongoose.Types.ObjectId(),
        designId: 'DEMO_DESIGN_002',
        name: 'DEMO - Classic Minimalist',
        productType: 'Áo T-shirt',
        material: 'Vải Cotton',
        color: 'Đen',
        price: 150000,
        productCode: 'DEMO002',
        description: 'Thiết kế tối giản với logo đơn giản, phù hợp mọi lứa tuổi',
        designImage: 'https://via.placeholder.com/300x300/4CAF50/FFFFFF?text=Classic+Minimalist',
        username: 'demo_designer',
        status: 'approved',
        isCustomDesign: false,
        designElements: []
      },
      {
        userId: new mongoose.Types.ObjectId(),
        designId: 'DEMO_DESIGN_003',
        name: 'DEMO - Retro Gaming',
        productType: 'Áo Hoodie',
        material: 'Vải Cotton',
        color: 'Xanh dương',
        price: 200000,
        productCode: 'DEMO003',
        description: 'Thiết kế áo thun với chủ đề game retro, phù hợp game thủ',
        designImage: 'https://via.placeholder.com/300x300/FF6B35/FFFFFF?text=Retro+Gaming',
        username: 'demo_designer',
        status: 'pending',
        isCustomDesign: true,
        designElements: [
          {
            type: 'text',
            content: 'RETRO GAMING',
            x: 40,
            y: 60,
            width: 140,
            height: 25,
            color: '#FF6B35'
          }
        ]
      },
      {
        userId: new mongoose.Types.ObjectId(),
        designId: 'DEMO_DESIGN_004',
        name: 'DEMO - Nature Explorer',
        productType: 'Áo Hoodie',
        material: 'Vải Cotton',
        color: 'Xanh lá',
        price: 170000,
        productCode: 'DEMO004',
        description: 'Thiết kế áo thun với họa tiết thiên nhiên, phù hợp người yêu thiên nhiên',
        designImage: 'https://via.placeholder.com/300x300/2196F3/FFFFFF?text=Nature+Explorer',
        username: 'demo_designer',
        status: 'rejected',
        isCustomDesign: false,
        designElements: []
      }
    ];

    for (const designData of demoDesigns) {
      const design = new Design(designData);
      await design.save();
    }

    console.log('Demo designs created successfully');
  } catch (error) {
    console.error('Error creating demo designs:', error);
  }
}

// API Quên mật khẩu
app.post("/api/forgot-password", async (req, res) => {
  try {
    const { email: rawEmail, role } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (!email || !role) {
      return res.status(400).json({ message: "Email và vai trò là bắt buộc" });
    }

    const Model = role === "customer" ? Customer : Designer;
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeExpiry = Date.now() + 30 * 60 * 1000;

    user.resetCode = resetCode;
    user.resetCodeExpiry = resetCodeExpiry;
    await user.save();

    await sendPasswordResetEmail(email, resetCode);

    res.json({ message: "Mã xác nhận đã được gửi đến email của bạn" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Đặt lại mật khẩu
app.post("/api/reset-password", async (req, res) => {
  try {
    const { email: rawEmail, role, code, newPassword } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    console.log(
      "Reset Password Request - Email:",
      email,
      "Role:",
      role,
      "Code:",
      code
    );

    if (!email || !role || !code || !newPassword) {
      return res
        .status(400)
        .json({ message: "Tất cả các trường đều bắt buộc" });
    }

    const Model = role === "customer" ? Customer : Designer;
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "Email không tồn tại" });
    }

    if (user.resetCode !== code || Date.now() > user.resetCodeExpiry) {
      return res
        .status(400)
        .json({ message: "Mã xác nhận không đúng hoặc đã hết hạn" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        message:
          "Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt ($,#,@,+,-,=,?,!).",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetCode = undefined;
    user.resetCodeExpiry = undefined;
    await user.save();

    res.status(200).json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("Error in /reset-password:", error);
    res
      .status(500).json({ message: "Lỗi khi đặt lại mật khẩu", error: error.message });
  }
});

// API Lấy thông tin người dùng
app.get("/api/user", verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const Model = role === "customer" ? Customer : Designer;
    const user = await Model.findById(id).select("-password -resetCode -resetCodeExpiry");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Cập nhật thông tin cá nhân
app.put("/api/update-profile", verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const { name, phone, gender, dob, avatar, email: rawEmail } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    console.log(
      "Update Profile Request - User ID:",
      id,
      "Role:",
      role,
      "Data:",
      req.body
    );

    const Model = role === "customer" ? Customer : Designer;
    const user = await Model.findById(id);

    if (!user) {
      console.log("User not found for ID:", id);
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingUser = await Model.findOne({ email });
      if (existingUser) {
        console.log("Email đã được đăng ký:", email);
        return res.status(400).json({ message: "Email đã được đăng ký" });
      }
      const OtherModel = role === "customer" ? Designer : Customer;
      const existingOtherUser = await OtherModel.findOne({ email });
      if (existingOtherUser) {
        return res.status(400).json({
          message: "Email đã được đăng ký",
        });
      }
      user.email = email;
    }

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.gender = gender || user.gender;
    user.dob = dob ? new Date(dob) : user.dob;
    user.avatar = avatar || user.avatar;

    await user.save();
    console.log("User updated successfully:", user);

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Xác nhận tài khoản
app.post("/api/verify-account", async (req, res) => {
  try {
    const { email: rawEmail, verificationCode } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Verifying account for email:", email);

    const customer = await Customer.findOne({ email });
    if (!customer) {
      console.log("Customer not found for email:", email);
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.isVerified) {
      return res.status(400).json({ message: "Tài khoản đã được xác thực." });
    }

    if (!customer.verificationCode || !customer.verificationCodeExpiry) {
      return res.status(400).json({ message: "No verification code found" });
    }

    if (customer.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Sai mã xác nhận" });
    }

    if (new Date() > customer.verificationCodeExpiry) {
      return res.status(400).json({ message: "Mã xác nhận đã hết hạn" });
    }

    customer.isVerified = true;
    customer.verificationCode = null;
    customer.verificationCodeExpiry = null;
    await customer.save();

    try {
      await sendRegistrationEmail(email, customer.username);
      console.log("Welcome email sent successfully for Customer");
    } catch (emailError) {
      console.error("Error sending welcome email for Customer:", emailError);
    }

    res.json({ message: "Tài khoản được xác thực thành công!" });
  } catch (error) {
    console.error("Error in verify-account:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Gửi lại mã xác nhận
app.post("/api/resend-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const customer = await Customer.findOne({ email });
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    if (customer.isVerified) {
      return res.status(400).json({ message: "Tài khoản đã được xác thực." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

    customer.verificationCode = verificationCode;
    customer.verificationCodeExpiry = verificationCodeExpiry;
    await customer.save();

    await sendVerificationEmail(email, customer.username, verificationCode);

    res.json({ message: "New verification code sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Xác nhận tài khoản cho Designer
app.post("/api/verify-designer-account", async (req, res) => {
  try {
    const { email: rawEmail, verificationCode } = req.body;
    const email = rawEmail ? rawEmail.toLowerCase() : null;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Verifying designer account for email:", email);

    const designer = await Designer.findOne({ email });
    if (!designer) {
      console.log("Designer not found for email:", email);
      return res.status(404).json({ message: "Designer not found" });
    }

    if (designer.isVerified) {
      return res.status(400).json({ message: "Tài khoản đã được xác thực." });
    }

    if (!designer.verificationCode || !designer.verificationCodeExpiry) {
      return res.status(400).json({ message: "No verification code found" });
    }

    if (designer.verificationCode !== verificationCode) {
      return res.status(400).json({ message: "Sai mã xác nhận" });
    }

    if (new Date() > designer.verificationCodeExpiry) {
      return res.status(400).json({ message: "Mã xác nhận đã hết hạn" });
    }

    designer.isVerified = true;
    designer.verificationCode = null;
    designer.verificationCodeExpiry = null;
    await designer.save();

    try {
      await sendRegistrationEmail(email, designer.username);
      console.log("Welcome email sent successfully for Designer");
    } catch (emailError) {
      console.error("Error sending welcome email for Designer:", emailError);
    }

    res.json({ message: "Tài khoản được xác thực thành công!" });
  } catch (error) {
    console.error("Error in verify-designer-account:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// API Gửi lại mã xác nhận cho Designer
app.post("/api/resend-designer-verification", async (req, res) => {
  try {
    const { email } = req.body;

    const designer = await Designer.findOne({ email });
    if (!designer) {
      return res.status(404).json({ message: "Designer not found" });
    }

    if (designer.isVerified) {
      return res.status(400).json({ message: "Tài khoản đã được xác thực." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpiry = new Date(Date.now() + 30 * 60 * 1000);

    designer.verificationCode = verificationCode;
    designer.verificationCodeExpiry = verificationCodeExpiry;
    await designer.save();

    await sendVerificationEmail(email, designer.username, verificationCode);

    res.json({ message: "New verification code sent successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

app.post('/api/submit-design', authMiddleware, async (req, res) => {
  console.log('REQ.BODY:', JSON.stringify(req.body, null, 2));
  try {
    const {
      designId,
      name,
      productType,
      material,
      color,
      price,
      productCode,
      description,
      designElements,
      designImage,
      status
    } = req.body;

    // Debug log for designImage
    console.log('Received designImage length:', designImage ? designImage.length : 'none');

    const userId = req.user.id;
    const username = req.user.username;

    // Validation dữ liệu
    if (!userId || !designId || !productType || !color || !price || !productCode) {
      return res.status(400).json({ message: 'Thiếu các trường bắt buộc' });
    }

    if (!['Áo T-shirt', 'Áo Hoodie'].includes(productType)) {
      return res.status(400).json({ message: 'Loại sản phẩm không hợp lệ' });
    }

    // Only validate price and designElements for non-draft
    if (status !== 'draft') {
    if (price <= 0) {
      return res.status(400).json({ message: 'Giá phải lớn hơn 0' });
    }
    // Validation designElements
    if (!Array.isArray(designElements) || designElements.length === 0) {
      return res.status(400).json({ message: 'Phải có ít nhất một phần tử thiết kế' });
    }
    for (const element of designElements) {
      if (!['text', 'image', 'pattern'].includes(element.type)) {
        return res.status(400).json({ message: 'Loại phần tử thiết kế không hợp lệ' });
      }
      if (element.type === 'text' && !element.content) {
        return res.status(400).json({ message: 'Phần tử văn bản phải có nội dung' });
      }
      if (element.width <= 0 || element.height <= 0) {
        return res.status(400).json({ message: 'Kích thước phần tử phải lớn hơn 0' });
      }
      }
    }

    // Kiểm tra trùng lặp
    const existingDesign = await Design.findOne({ $or: [{ productCode }, { designId }] });
    if (existingDesign) {
      return res.status(400).json({ message: 'Mã sản phẩm hoặc ID thiết kế đã tồn tại' });
    }

    // Tạo và lưu thiết kế
    const newDesign = new Design({
      userId,
      username,
      name,
      designId,
      productType,
      material: material || 'Vải Cotton',
      color,
      price,
      productCode,
      description: description || '',
      designElements: designElements.map((element) => ({
        type: element.type,
        content: element.content,
        x: element.x || 0,
        y: element.y || 0,
        width: element.width,
        height: element.height === 'auto' ? 100 : element.height,
        color: element.color || '#000000',
      })),
      designImage: typeof designImage === 'string' ? designImage : '',
      isCustomDesign: designElements && designElements.length > 0, // Set as custom design if it has design elements
      status: status === 'draft' ? 'draft' : 'pending',
    });

    await newDesign.save();
    
    // Create notification for new design submission (not drafts)
    if (newDesign.status !== 'draft') {
      await createNotification(
        'new-design',
        'Thiết kế mới chờ duyệt',
        `Thiết kế "${newDesign.name}" của ${username} vừa được gửi lên chờ duyệt.`,
        { designId: newDesign._id, designer: username, name: newDesign.name },
        'high'
      );
    }
    
    res.status(201).json({ message: 'Thiết kế đã được lưu thành công', designId });
  } catch (error) {
    console.error('Lỗi khi lưu thiết kế:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Mã sản phẩm hoặc ID thiết kế đã tồn tại' });
    }
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
});

// API cập nhật draft thiết kế
app.put('/api/update-draft', authMiddleware, async (req, res) => {
  console.log('UPDATE DRAFT REQ.BODY:', JSON.stringify(req.body, null, 2));
  try {
    const {
      designId,
      name,
      productType,
      material,
      color,
      price,
      productCode,
      description,
      designElements,
      designImage,
      status
    } = req.body;

    const userId = req.user.id;
    const username = req.user.username;

    // Validation dữ liệu
    if (!userId || !designId || !productType || !color || !productCode) {
      return res.status(400).json({ message: 'Thiếu các trường bắt buộc' });
    }

    if (!['Áo T-shirt', 'Áo Hoodie'].includes(productType)) {
      return res.status(400).json({ message: 'Loại sản phẩm không hợp lệ' });
    }

    // Tìm draft hiện tại
    const existingDesign = await Design.findOne({ 
      designId: designId,
      userId: userId,
      status: 'draft'
    });

    if (!existingDesign) {
      return res.status(404).json({ message: 'Không tìm thấy draft thiết kế' });
    }

    // Cập nhật draft
    existingDesign.name = name || existingDesign.name;
    existingDesign.productType = productType;
    existingDesign.material = material || 'Vải Cotton';
    existingDesign.color = color;
    existingDesign.price = price || 0;
    existingDesign.productCode = productCode;
    existingDesign.description = description || '';
    existingDesign.designElements = designElements.map((element) => ({
      type: element.type,
      content: element.content,
      x: element.x || 0,
      y: element.y || 0,
      width: element.width,
      height: element.height === 'auto' ? 100 : element.height,
      color: element.color || '#000000',
    }));
    existingDesign.designImage = typeof designImage === 'string' ? designImage : existingDesign.designImage;
    existingDesign.isCustomDesign = designElements && designElements.length > 0; // Update custom design flag
    existingDesign.status = status === 'draft' ? 'draft' : 'pending';
    existingDesign.updatedAt = new Date();

    await existingDesign.save();
    
    // Create notification if draft is changed to pending
    if (existingDesign.status === 'pending' && status !== 'draft') {
      await createNotification(
        'new-design',
        'Thiết kế mới chờ duyệt',
        `Thiết kế "${existingDesign.name}" của ${username} vừa được gửi lên chờ duyệt.`,
        { designId: existingDesign._id, designer: username, name: existingDesign.name },
        'high'
      );
    }
    
    res.status(200).json({ message: 'Draft đã được cập nhật thành công', designId });
  } catch (error) {
    console.error('Lỗi khi cập nhật draft:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ', error: error.message });
  }
});

// API lấy tất cả thiết kế đã duyệt (for homepage/products and designer shop)
app.get('/api/designs', async (req, res) => {
  try {
    const { username, productType } = req.query;
    let query = { status: 'approved' }; // Only approved designs
    if (username) query.username = username; // Filter by designer if provided
    
    // Handle custom design filter
    if (productType === 'custom_design') {
      query.isCustomDesign = true;
    } else if (productType) {
      query.productType = productType; // Filter by product type if provided
    }
    
    const designs = await Design.find(query);
    res.status(200).json(designs);
  } catch (error) {
    console.error('Lỗi khi lấy thiết kế:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy thiết kế', error: error.message });
  }
});

// API lấy thiết kế của designer đang đăng nhập
app.get('/api/my-designs', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    const designs = await Design.find({ username }).sort({ createdAt: -1 });
    res.status(200).json(designs);
  } catch (error) {
    console.error('Lỗi khi lấy thiết kế của designer:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy thiết kế', error: error.message });
  }
});

// API lấy tất cả thiết kế (admin dashboard)
app.get('/api/admin/designs', adminAuthMiddleware, async (req, res) => {
  try {
    // Exclude demo designs and only get real designs
    const designs = await Design.find({ 
      name: { $not: /^DEMO/ } // Exclude designs with names starting with "DEMO"
    }); 
    res.status(200).json(designs);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy thiết kế', error: error.message });
  }
});

// API approve a design (admin)
app.post('/api/admin/designs/:id/approve', async (req, res) => {
  try {
    const design = await Design.findByIdAndUpdate(req.params.id, { status: 'approved' }, { new: true });
    if (!design) return res.status(404).json({ message: 'Design not found' });
    // Notify admin of design approval
    await createNotification(
      'system',
      'Thiết kế đã được duyệt',
      `Thiết kế "${design.name}" của ${design.username} đã được duyệt.`,
      { designId: design._id, designer: design.username, name: design.name },
      'medium'
    );
    // Notify designer via email
    try {
      const designer = await Designer.findOne({ username: design.username });
      if (designer && designer.email) {
        const designDetails = {
          description: design.description,
          productType: design.productType,
          material: design.material,
          price: design.price,
          productCode: design.productCode,
          designImage: design.designImage
        };
        await sendDesignApprovedEmail(designer.email, designer.name || designer.username, design.name, designDetails);
      }
    } catch (e) { console.error('Error sending design approved email:', e); }
    res.json({ message: 'Design approved', design });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API reject a design (admin)
app.post('/api/admin/designs/:id/reject', async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const design = await Design.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', rejectionReason: rejectionReason || '' },
      { new: true }
    );
    if (!design) return res.status(404).json({ message: 'Design not found' });
    // Notify admin of design rejection
    await createNotification(
      'system',
      'Thiết kế bị từ chối',
      `Thiết kế "${design.name}" của ${design.username} đã bị từ chối.`,
      { designId: design._id, designer: design.username, name: design.name, reason: rejectionReason || '' },
      'medium'
    );
    // Notify designer via email
    try {
      const designer = await Designer.findOne({ username: design.username });
      if (designer && designer.email) {
        const designDetails = {
          description: design.description,
          productType: design.productType,
          material: design.material,
          price: design.price,
          productCode: design.productCode,
          designImage: design.designImage
        };
        await sendDesignRejectedEmail(designer.email, designer.name || designer.username, design.name, rejectionReason || '', designDetails);
      }
    } catch (e) { console.error('Error sending design rejected email:', e); }
    res.json({ message: 'Design rejected', design });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API cleanup demo designs (admin)
app.delete('/api/admin/cleanup-demo-designs', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await Design.deleteMany({ name: { $regex: /^DEMO/ } });
    console.log(`Cleaned up ${result.deletedCount} demo designs`);
    res.json({ message: `Cleaned up ${result.deletedCount} demo designs`, deletedCount: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get reviews for a product
app.get('/api/reviews', async (req, res) => {
  try {
    const { designId } = req.query;
    if (!designId) return res.status(400).json({ message: 'Missing designId' });
    const reviews = await Review.find({ designId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get reviews by username
app.get('/api/user-reviews', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) return res.status(400).json({ message: 'Missing username' });
    const reviews = await Review.find({ username }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get review stats for a product
app.get('/api/review-stats', async (req, res) => {
  try {
    const { designId } = req.query;
    if (!designId) return res.status(400).json({ message: 'Missing designId' });
    const reviews = await Review.find({ designId });
    const count = reviews.length;
    const avg = count ? (reviews.reduce((sum, r) => sum + r.rating, 0) / count) : 0;
    res.json({ average: avg, count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Create a new review
app.post('/api/reviews', async (req, res) => {
  try {
    const { designId, username, avatar, rating, feedback, color, size, descriptionMatch, material } = req.body;
    
    // If avatar is not provided, look it up from Customer or Designer
    let finalAvatar = avatar;
    if (!finalAvatar) {
      let user = await Customer.findOne({ username });
      if (user && user.avatar) {
        finalAvatar = user.avatar;
        console.log('[REVIEW] Found avatar in Customer:', finalAvatar, 'for username:', username);
      } else {
        user = await Designer.findOne({ username });
        if (user && user.avatar) {
          finalAvatar = user.avatar;
          console.log('[REVIEW] Found avatar in Designer:', finalAvatar, 'for username:', username);
        } else {
          finalAvatar = 'resources/user-circle.png';
          console.log('[REVIEW] No avatar found for username:', username, 'using default.');
        }
      }
    } else {
      console.log('[REVIEW] Avatar provided in request:', finalAvatar, 'for username:', username);
    }
    
    // Log the avatar and username before saving
    console.log('[REVIEW] Avatar to be saved for review:', finalAvatar, 'for username:', username);
    
    // Validation
    if (!designId || !username || !rating || !feedback) {
      return res.status(400).json({ message: 'Missing required fields: designId, username, rating, feedback' });
    }
    
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    
    if (feedback.trim().length < 10) {
      return res.status(400).json({ message: 'Feedback must be at least 10 characters long' });
    }
    
    // Check if user has already reviewed this design
    const existingReview = await Review.findOne({ designId, username });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this product' });
    }
    
    // Create the review (now always includes avatar)
    const review = await Review.create({
      designId,
      username,
      avatar: finalAvatar,
      rating,
      feedback: feedback.trim(),
      color,
      size,
      descriptionMatch,
      material,
      createdAt: new Date()
    });
    
    console.log('[REVIEW] Review created:', review);
    res.status(201).json({ message: 'Review created successfully', review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Like a design
app.post('/api/designs/:designId/like', async (req, res) => {
  try {
    const { designId } = req.params;
    const design = await Design.findOneAndUpdate(
      { designId },
      { $inc: { likes: 1 } },
      { new: true }
    );
    if (!design) return res.status(404).json({ message: 'Design not found' });
    res.json({ likes: design.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unlike a design
app.post('/api/designs/:designId/unlike', async (req, res) => {
  try {
    const { designId } = req.params;
    const design = await Design.findOne({ designId });
    if (!design) return res.status(404).json({ message: 'Design not found' });
    design.likes = Math.max(0, (design.likes || 0) - 1);
    await design.save();
    res.json({ likes: design.likes });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- PAYOS CHECKOUT ENDPOINT ---
app.post('/api/create-payos-order', async (req, res) => {
  let { amount, productTotal, shippingFee, description, returnUrl, orderCode, customer, items } = req.body;
  try {
    // Ensure items is always an array
    if (!Array.isArray(items)) items = [];
    // Ensure orderCode is an integer (remove non-digits and parse)
    if (typeof orderCode === 'string') {
      orderCode = parseInt(orderCode.replace(/\D/g, ''), 10);
    }
    
    // Calculate productTotal and shippingFee if not provided (backward compatibility)
    if (productTotal === undefined || shippingFee === undefined) {
      // Estimate shipping fee based on order amount
      let estimatedShippingFee = 15000; // Default to Tiết kiệm
      if (amount > 100000) {
        estimatedShippingFee = 25000; // Nhanh for higher value orders
      }
      if (amount <= 50000) {
        estimatedShippingFee = Math.min(estimatedShippingFee, Math.floor(amount * 0.3));
      }
      shippingFee = estimatedShippingFee;
      productTotal = Math.max(0, amount - estimatedShippingFee);
    }
    
    // --- PayOS signature generation ---
    const cancelUrl = `${returnUrl}?cancel=1&orderCode=${orderCode}`;
    const checksumKey = 'f78c58627c4a3a7345f69488e43010f3ec6207344b5734fc9c082a2872694952'; // Your checksum key
    // Prepare data string in alphabetical order of keys
    const dataString = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
    const signature = crypto.createHmac('sha256', checksumKey).update(dataString).digest('hex');

    // If items is empty (custom or mixed order), add a dummy item for PayOS API only
    let payosItems = Array.isArray(items) ? [...items] : [];
    if (payosItems.length === 0) {
      payosItems.push({
        name: 'Thiết kế tùy chỉnh',
        price: amount || 100000,
        quantity: 1,
        type: 'custom-design',
        note: 'Dummy item for PayOS',
      });
    }
    
    const response = await axios.post('https://api-merchant.payos.vn/v2/payment-requests', {
      amount,
      description,
      orderCode,
      cancelUrl,
      returnUrl,
      signature
    }, {
      headers: {
        'x-client-id': '12fdcdb7-433f-4230-aa68-505ce0b8dbae',
        'x-api-key': '10b4a65b-d594-4781-9bb6-c70c41c84016',
        'Content-Type': 'application/json'
      }
    });
    console.log('PayOS response:', response.data);
    if (response.data && response.data.data && response.data.data.checkoutUrl) {
      // Save order to DB (status: PENDING)
      let usernameToSave = customer && customer.username ? customer.username : 
                          (customer && customer.email ? customer.email.split('@')[0] : 'anonymous');
      
      // Handle edge cases where username might be "undefined" or "null"
      if (usernameToSave === 'undefined' || usernameToSave === 'null' || !usernameToSave) {
        usernameToSave = customer && customer.email ? customer.email.split('@')[0] : 'anonymous';
      }

      // Look up designer info for the first product (if any)
      let designerInfo = null;
      if (items && items.length > 0 && items[0].productId) {
        try {
          const design = await Design.findOne({ designId: items[0].productId });
          if (design) {
            const designer = await Designer.findOne({ username: design.username });
            if (designer) {
              designerInfo = {
                username: designer.username,
                name: designer.name,
                email: designer.email
              };
            } else {
              designerInfo = {
                username: design.username,
                name: design.username,
                email: ''
              };
            }
          }
        } catch (err) {
          console.error('Error looking up designer for order:', err);
        }
      }
      
      // Check if this order contains custom designs
      const customDesignItems = items ? items.filter(item => item.type === 'custom-design') : [];
      const regularItems = items ? items.filter(item => item.type !== 'custom-design') : [];
      
      // Determine order type
      let orderType = 'product_purchase';
      let customDesign = null;
      
      if (customDesignItems.length > 0) {
        if (regularItems.length > 0) {
          orderType = 'mixed'; // Both custom design and regular products
        } else {
          orderType = 'custom_design'; // Only custom design
        }
        
        // Use the first custom design item as the main custom design
        if (customDesignItems.length > 0) {
          const mainCustomDesign = customDesignItems[0];
          customDesign = {
            designType: mainCustomDesign.designType || 'TSHIRT',
            color: mainCustomDesign.color || 'N/A',
            size: mainCustomDesign.size || 'N/A',
            quantity: mainCustomDesign.quantity || 1,
            designImage: mainCustomDesign.designImage || '',
            designElements: Array.isArray(mainCustomDesign.designElements) ? mainCustomDesign.designElements : [],
            specialInstructions: mainCustomDesign.notes || ''
          };
        }
      }
      
      // Debug log for order object
      console.log('Saving order to DB:', {
        orderCode: String(orderCode),
        orderType,
        amount,
        productTotal,
        shippingFee,
        status: 'PENDING',
        username: usernameToSave,
        customer: { ...customer, username: usernameToSave },
        items: regularItems,
        customDesign: customDesign,
        designer: designerInfo,
        payos: {
          paymentRequestId: response.data.data.paymentRequestId,
          checkoutUrl: response.data.data.checkoutUrl,
          raw: response.data.data,
        },
      });
      await Order.create({
        orderCode: String(orderCode),
        orderType,
        amount, // Total amount (productTotal + shippingFee) - kept for backward compatibility
        productTotal, // Product subtotal (excluding shipping fee)
        shippingFee, // Shipping fee
        status: 'PENDING',
        username: usernameToSave,
        customer: { 
          ...customer, 
          username: usernameToSave 
        },
        items: regularItems, // Only store regular items, custom designs go in customDesign field
        customDesign: customDesign, // Store custom design data
        designer: designerInfo, // <-- Save designer info here
        payos: {
          paymentRequestId: response.data.data.paymentRequestId,
          checkoutUrl: response.data.data.checkoutUrl,
          raw: response.data.data,
        },
      });
      // Notify admin of new order
      await createNotification(
        'new-order',
        'Đơn hàng mới',
        `Khách hàng ${customer && customer.name ? customer.name : usernameToSave} vừa đặt đơn hàng mới (Mã: ${orderCode}).`,
        { orderCode, customer: customer || {}, amount, productTotal, shippingFee, items },
        'high'
      );
      res.json({ payUrl: response.data.data.checkoutUrl });
    } else {
      res.status(400).json({ error: 'PayOS error', details: response.data });
    }
  } catch (err) {
    console.error('PayOS error:', err);
    res.status(500).json({ error: 'Failed to create PayOS order', details: err && err.stack ? err.stack : err.message });
  }
});

// API: Admin dashboard stats
app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
  try {
    // Count orders, customers, designers, products
    const [orders, customers, designers, products] = await Promise.all([
      Order.countDocuments(),
      Customer.countDocuments(),
      Designer.countDocuments(),
      Design.countDocuments(),
    ]);
    // Sum revenue from paid orders (including all post-paid statuses)
    const paidOrders = await Order.find({ status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] } });
    const revenue = paidOrders.reduce((sum, o) => sum + (o.amount || 0), 0);
    res.json({ revenue, orders, customers, designers, products });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch admin stats', details: err.message });
  }
});

// Xóa thiết kế (chỉ cho chủ sở hữu)
app.delete('/api/designs/:designId', authMiddleware, async (req, res) => {
  try {
    const { designId } = req.params;
    const userId = req.user.id;
    // Only allow deleting own design
    const design = await Design.findOne({ designId });
    if (!design) return res.status(404).json({ message: 'Không tìm thấy thiết kế.' });
    if (design.userId.toString() !== userId) return res.status(403).json({ message: 'Bạn không có quyền xóa thiết kế này.' });
    await Design.deleteOne({ designId });
    res.json({ message: 'Đã xóa nháp thành công.' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server khi xóa thiết kế.' });
  }
});

// API: Get current user's paid orders
app.get('/api/my-orders', verifyToken, async (req, res) => {
  try {
    const { username } = req.user;
    // Find orders where either customer.username or root-level username matches
    const orders = await Order.find({
      $or: [
        { 'customer.username': username },
        { username: username }
      ]
    }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Mark order as COMPLETED
app.post('/api/admin/orders/:id/complete', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'COMPLETED' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order marked as COMPLETED', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Mark order as DELIVERED
app.post('/api/admin/orders/:id/deliver', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'DELIVERED' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Send email notification to customer
    try {
      const customerEmail = order.customer && order.customer.email;
      const customerName = order.customer && order.customer.name;
      if (customerEmail) {
        await sendOrderDeliveringEmail(
          customerEmail,
          customerName || order.username,
          order.orderCode,
          {
            amount: order.amount,
            items: order.items
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending order delivering email:', emailError);
    }
    
    res.json({ message: 'Order marked as DELIVERED', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get all orders for admin (with optional limit)
app.get('/api/admin/orders', adminAuthMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 0;
    const orders = await Order.find().sort({ createdAt: -1 }).limit(limit);
    
    // Format orders for frontend with enhanced information
    const formatted = await Promise.all(orders.map(async (order) => {
      // Get designer information from products if not already set
      let designerInfo = order.designer;
      
      if (!designerInfo && order.items && order.items.length > 0) {
        // Try to get designer info from the first product
        const firstProduct = order.items[0];
        if (firstProduct && firstProduct.productId) {
          try {
            const design = await Design.findOne({ designId: firstProduct.productId });
            if (design) {
              // Get designer details from Designer collection
              const designer = await Designer.findOne({ username: design.username });
              if (designer) {
                designerInfo = {
                  username: designer.username,
                  name: designer.name,
                  email: designer.email
                };
              } else {
                // Fallback to design username if designer not found
                designerInfo = {
                  username: design.username,
                  name: design.username,
                  email: ''
                };
              }
            }
          } catch (error) {
            console.error('Error fetching designer info for order:', order._id, error);
          }
        }
      }
      
      return {
        id: order._id,
        orderCode: order.orderCode,
        orderType: order.orderType || 'product_purchase',
        items: order.items || [],
        customDesign: order.customDesign || null,
        customer: order.customer || {},
        designer: designerInfo,
        username: order.username,
        status: order.status,
        amount: order.amount,
        notes: order.notes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        payos: order.payos || {}
      };
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// TEMP: Force all orders to PAID for testing
app.post('/api/admin/force-pay-all-orders', async (req, res) => {
  try {
    const result = await Order.updateMany({}, { status: 'PAID' });
    res.json({ message: 'All orders set to PAID', result });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Robust signature verification helpers for PayOS
function sortObjDataByKey(object) {
  return Object.keys(object)
    .sort()
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

function convertObjToQueryStr(object) {
  return Object.keys(object)
    .map((key) => {
      let value = object[key];
      // Handle null/undefined
      if ([null, undefined, "undefined", "null"].includes(value)) {
        value = "";
      }
      // Handle arrays of objects
      if (Array.isArray(value)) {
        value = JSON.stringify(value.map(val => sortObjDataByKey(val)));
      }
      return `${key}=${value}`;
    })
    .join("&");
}

// PayOS webhook: update order status to PAID when payment is successful (with robust signature verification and logging)
app.post('/api/payos/webhook', express.json(), async (req, res) => {
  try {
    console.log('PayOS webhook received:', JSON.stringify(req.body, null, 2));
    const { code, desc, success, data, signature } = req.body;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || 'your_payos_checksum_key';
    if (!signature || !data) {
      console.log('Missing signature or data');
      return res.status(400).json({ success: false, message: 'Missing signature or data' });
    }
    // Robust signature logic
    const sortedData = sortObjDataByKey(data);
    const dataString = convertObjToQueryStr(sortedData);
    const expectedSignature = require('crypto').createHmac('sha256', checksumKey).update(dataString).digest('hex');
    console.log('Expected signature:', expectedSignature);
    console.log('Received signature:', signature);
    if (signature !== expectedSignature) {
      console.log('Invalid signature');
      return res.status(403).json({ success: false, message: 'Invalid signature' });
    }
    if (success && data.code === '00' && data.orderCode) {
      console.log('Looking for order with orderCode:', data.orderCode);
      const order = await Order.findOneAndUpdate(
        { orderCode: String(data.orderCode) },
        { status: 'PAID' },
        { new: true }
      );
      console.log('Order update result:', order);
      if (order) {
        // Send email notification to customer
        try {
          const customerEmail = order.customer && order.customer.email;
          const customerName = order.customer && order.customer.name;
          if (customerEmail) {
            await sendOrderPaidEmail(
              customerEmail,
              customerName || order.username,
              order.orderCode,
              {
                amount: order.amount,
                items: order.items
              }
            );
          }
        } catch (emailError) {
          console.error('Error sending order paid email:', emailError);
        }
        
        // Notify admin of payment received
        await createNotification(
          'payment',
          'Thanh toán thành công',
          `Đơn hàng của khách hàng ${order.customer && order.customer.name ? order.customer.name : order.username} (Mã: ${order.orderCode}) đã được thanh toán.`,
          { orderId: order._id, orderCode: order.orderCode, amount: order.amount },
          'high'
        );
        return res.status(200).json({ success: true });
      } else {
        return res.status(404).json({ success: false, message: 'Order not found' });
      }
    }
    console.log('No action taken for webhook');
    res.status(200).json({ success: false, message: 'No action taken' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// API: Mark order as DELIVERED_FINAL
app.post('/api/admin/orders/:id/finish', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'DELIVERED_FINAL' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Send email notification to customer
    try {
      const customerEmail = order.customer && order.customer.email;
      const customerName = order.customer && order.customer.name;
      if (customerEmail) {
        await sendOrderDeliveredEmail(
          customerEmail,
          customerName || order.username,
          order.orderCode,
          {
            amount: order.amount,
            items: order.items
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending order delivered email:', emailError);
    }
    
    res.json({ message: 'Order marked as DELIVERED_FINAL', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// --- Handle PayOS payment cancellation redirect ---
app.get('/payment-success.html', async (req, res, next) => {
  return res.sendFile(path.join(__dirname, 'payment-success.html'));
});

app.use(express.static(__dirname));

// API: Mark order as PAID
app.post('/api/admin/orders/:id/paid', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'PAID' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    
    // Send email notification to customer
    try {
      const customerEmail = order.customer && order.customer.email;
      const customerName = order.customer && order.customer.name;
      if (customerEmail) {
        await sendOrderPaidEmail(
          customerEmail,
          customerName || order.username,
          order.orderCode,
          {
            amount: order.amount,
            items: order.items
          }
        );
      }
    } catch (emailError) {
      console.error('Error sending order paid email:', emailError);
    }
    
    // Notify admin of payment received
    await createNotification(
      'payment',
      'Thanh toán thành công',
      `Đơn hàng của khách hàng ${order.customer && order.customer.name ? order.customer.name : order.username} (Mã: ${order.orderCode}) đã được thanh toán.`,
      { orderId: order._id, orderCode: order.orderCode, amount: order.amount },
      'high'
    );
    res.json({ message: 'Order marked as PAID', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Mark order as PENDING
app.post('/api/admin/orders/:id/pending', async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: 'PENDING' },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Order marked as PENDING', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Update customer info for an order (admin)
app.put('/api/admin/orders/:id/customer', async (req, res) => {
  try {
    const { name, email, phone, address, username } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        customer: { name, email, phone, address, username },
        username: username
      },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({ message: 'Customer info updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Create custom design order
app.post('/api/custom-design-order', async (req, res) => {
  try {
    const {
      customer,
      customDesign,
      amount,
      specialInstructions
    } = req.body;

    // Generate unique order code
    const orderCode = 'CUSTOM' + Date.now() + Math.floor(Math.random() * 1000);

    // Ensure we have a valid username
    let usernameToSave = customer.username || customer.email?.split('@')[0] || 'anonymous';
    if (usernameToSave === 'undefined' || usernameToSave === 'null' || !usernameToSave) {
      usernameToSave = customer.email ? customer.email.split('@')[0] : 'anonymous';
    }

    const order = new Order({
      orderCode,
      orderType: 'custom_design',
      amount,
      customer,
      customDesign: {
        ...customDesign,
        specialInstructions
      },
      status: 'PENDING',
      username: usernameToSave
    });

    const savedOrder = await order.save();

    // Create notification for admin
    await createNotification(
      'new-order',
      'Đơn hàng thiết kế tùy chỉnh mới',
      `Khách hàng ${customer.name || customer.username} vừa đặt đơn hàng thiết kế tùy chỉnh (Mã: ${orderCode}).`,
      { 
        orderId: savedOrder._id, 
        orderCode, 
        customer: customer.name || customer.username,
        amount 
      },
      'high'
    );

    res.status(201).json({
      message: 'Custom design order created successfully',
      order: savedOrder
    });
  } catch (error) {
    console.error('Error creating custom design order:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Update custom design order status
app.post('/api/admin/orders/:id/design-status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;
    // Fetch the order first
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    // Update status and notes
    order.status = status;
    order.notes = notes || order.notes;
    await order.save();
    // Create notification based on status
    let notificationTitle = '';
    let notificationMessage = '';
    // Send email to customer if approved or rejected
    if (status === 'DESIGN_APPROVED') {
      if (order.customer && order.customer.email) {
        await sendCustomDesignApprovedEmail(
          order.customer.email,
          order.customer.name || order.customer.username || order.username || '',
          order.orderCode,
          order.customDesign
        );
      }
      notificationTitle = 'Thiết kế đã được duyệt';
      notificationMessage = `Thiết kế cho đơn hàng (Mã: ${order.orderCode}) đã được duyệt và đang được sản xuất.`;
    } else if (status === 'DESIGN_REJECTED') {
      if (order.customer && order.customer.email) {
        await sendCustomDesignRejectedEmail(
          order.customer.email,
          order.customer.name || order.customer.username || order.username || '',
          order.orderCode,
          order.customDesign,
          notes || ''
        );
      }
      notificationTitle = 'Thiết kế bị từ chối';
      notificationMessage = `Thiết kế cho đơn hàng (Mã: ${order.orderCode}) đã bị từ chối.`;
    } else if (status === 'DESIGN_IN_PROGRESS') {
      notificationTitle = 'Thiết kế đang được thực hiện';
      notificationMessage = `Đơn hàng thiết kế tùy chỉnh (Mã: ${order.orderCode}) đang được thực hiện.`;
    }
    if (notificationTitle) {
      await createNotification(
        'system',
        notificationTitle,
        notificationMessage,
        { orderId: order._id, orderCode: order.orderCode },
        'medium'
      );
    }
    res.json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API update a design (admin)
app.put('/api/admin/designs/:id', async (req, res) => {
  try {
    const { name, description, price } = req.body;
    const design = await Design.findById(req.params.id);
    if (!design) return res.status(404).json({ message: 'Design not found' });
    const modifiedFields = [];
    if (name !== undefined && name !== design.name) modifiedFields.push('Tên thiết kế');
    if (description !== undefined && description !== design.description) modifiedFields.push('Mô tả');
    if (price !== undefined && price !== design.price) modifiedFields.push('Giá');
    // Update fields
    design.name = name !== undefined ? name : design.name;
    design.description = description !== undefined ? description : design.description;
    design.price = price !== undefined ? price : design.price;
    // Only update modifiedFields if there are changes
    if (modifiedFields.length > 0) {
      design.modifiedFields = modifiedFields;
    }
    await design.save();
    res.json({ message: 'Design updated', design });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== DESIGNER MANAGEMENT ENDPOINTS =====

// API: Get all designers (admin)
app.get('/api/admin/designers', async (req, res) => {
  try {
    const designers = await Designer.find({ isDeleted: false })
      .select('-password -verificationCode -resetCode')
      .sort({ createdAt: -1 });
    
    const designersWithStats = await Promise.all(designers.map(async (designer) => {
      // Get designer's design count
      const designCount = await Design.countDocuments({ username: designer.username });
      
      // Get designer's total sales
      const designs = await Design.find({ username: designer.username });
      const designIds = designs.map(d => d.designId);
      const totalSales = await Order.aggregate([
        { $match: { 'items.productId': { $in: designIds }, status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      const grossSales = totalSales.length > 0 ? totalSales[0].total : 0;
      const designerShare = Math.round(grossSales * 0.4); // 40% for designer
      
      return {
        ...designer.toObject(),
        designCount,
        totalSales: grossSales,
        totalRevenue: designerShare, // Designer's actual earnings (40% share)
        isCurrentlyBanned: designer.isBanned && (!designer.banExpiry || new Date() < designer.banExpiry)
      };
    }));
    
    res.json(designersWithStats);
  } catch (error) {
    console.error('Error fetching designers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Ban designer (admin)
app.post('/api/admin/designers/:id/ban', async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in days
    const designer = await Designer.findById(req.params.id);
    
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    
    if (designer.isDeleted) {
      return res.status(400).json({ message: 'Cannot ban deleted designer' });
    }
    
    // Calculate ban expiry date
    const banExpiry = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;
    
    designer.isBanned = true;
    designer.banReason = reason || '';
    designer.banExpiry = banExpiry;
    designer.bannedBy = req.body.adminUsername || 'Admin';
    
    await designer.save();
    
    // Send ban email notification
    try {
      const banDuration = duration ? `${duration} ngày` : 'Vĩnh viễn';
      await sendBanEmail(
        designer.email,
        designer.username,
        reason || 'Vi phạm quy định nền tảng',
        banDuration,
        req.body.adminUsername || 'Admin'
      );
      console.log(`Ban email sent to designer ${designer.username} (${designer.email})`);
    } catch (emailError) {
      console.error('Error sending ban email:', emailError);
      // Don't fail the ban operation if email fails
    }
    
    res.json({ 
      message: 'Designer banned successfully', 
      designer: {
        ...designer.toObject(),
        isCurrentlyBanned: true
      }
    });
  } catch (error) {
    console.error('Error banning designer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Unban designer (admin)
app.post('/api/admin/designers/:id/unban', async (req, res) => {
  try {
    const designer = await Designer.findById(req.params.id);
    
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    
    designer.isBanned = false;
    designer.banReason = '';
    designer.banExpiry = null;
    designer.bannedBy = '';
    
    await designer.save();
    
    // Send unban email notification
    try {
      await sendUnbanEmail(
        designer.email,
        designer.username,
        req.body.adminUsername || 'Admin'
      );
      console.log(`Unban email sent to designer ${designer.username} (${designer.email})`);
    } catch (emailError) {
      console.error('Error sending unban email:', emailError);
      // Don't fail the unban operation if email fails
    }
    
    res.json({ 
      message: 'Designer unbanned successfully', 
      designer: {
        ...designer.toObject(),
        isCurrentlyBanned: false
      }
    });
  } catch (error) {
    console.error('Error unbanning designer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Delete designer account (admin)
app.delete('/api/admin/designers/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    const designer = await Designer.findById(req.params.id);
    
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    
    if (designer.isDeleted) {
      return res.status(400).json({ message: 'Designer already deleted' });
    }
    
    // Soft delete - mark as deleted instead of actually removing
    designer.isDeleted = true;
    designer.deletedAt = new Date();
    designer.deletedBy = req.body.adminUsername || 'Admin';
    
    // Also ban them to prevent login
    designer.isBanned = true;
    designer.banReason = reason || 'Account deleted by admin';
    designer.banExpiry = null; // Permanent ban
    
    await designer.save();
    
    res.json({ 
      message: 'Designer account deleted successfully',
      designer: {
        ...designer.toObject(),
        isCurrentlyBanned: true
      }
    });
  } catch (error) {
    console.error('Error deleting designer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get designer details (admin)
app.get('/api/admin/designers/:id', async (req, res) => {
  try {
    const designer = await Designer.findById(req.params.id)
      .select('-password -verificationCode -resetCode');
    
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    
    // Get designer's designs
    const designs = await Design.find({ username: designer.username })
      .sort({ createdAt: -1 });
    
    // Get designer's orders
    const designIds = designs.map(d => d.designId);
    const orders = await Order.find({ 'items.productId': { $in: designIds } })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Calculate total sales using the same logic as designer stats API
    const designerOrders = await Order.find({
      'designer.username': designer.username,
      status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] }
    });
    
    // Calculate revenue (40% of product totals, excluding shipping fees)
    const totalRevenue = designerOrders.reduce((sum, order) => {
      // Use productTotal if available, otherwise fall back to amount (for backward compatibility)
      const productAmount = order.productTotal !== undefined ? order.productTotal : order.amount;
      return sum + (productAmount * 0.4);
    }, 0);
    
    // Calculate gross sales for reference
    const grossSales = designerOrders.reduce((sum, order) => {
      const productAmount = order.productTotal !== undefined ? order.productTotal : order.amount;
      return sum + productAmount;
    }, 0);
    
    res.json({
      designer: {
        ...designer.toObject(),
        isCurrentlyBanned: designer.isBanned && (!designer.banExpiry || new Date() < designer.banExpiry)
      },
      designs,
      recentOrders: orders,
      totalSales: grossSales,
      totalRevenue: Math.round(totalRevenue), // Designer's actual earnings (40% share)
      designCount: designs.length
    });
  } catch (error) {
    console.error('Error fetching designer details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== END DESIGNER MANAGEMENT ENDPOINTS =====

// ===== CUSTOMER MANAGEMENT ENDPOINTS =====

// API: Get all customers (admin)
app.get('/api/admin/customers', async (req, res) => {
  try {
    const customers = await Customer.find({ isDeleted: false })
      .select('-password -verificationCode -resetCode')
      .sort({ createdAt: -1 });
    
    const customersWithStats = await Promise.all(customers.map(async (customer) => {
      // Get customer's order count
      const orderCount = await Order.countDocuments({ 'customer.username': customer.username });
      
      // Get customer's total spending
      const totalSpending = await Order.aggregate([
        { $match: { 'customer.username': customer.username } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      
      return {
        ...customer.toObject(),
        orderCount,
        totalSpending: totalSpending.length > 0 ? totalSpending[0].total : 0,
        isCurrentlyBanned: customer.isBanned && (!customer.banExpiry || new Date() < customer.banExpiry)
      };
    }));
    
    res.json(customersWithStats);
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Ban customer (admin)
app.post('/api/admin/customers/:id/ban', async (req, res) => {
  try {
    const { reason, duration } = req.body; // duration in days
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    if (customer.isDeleted) {
      return res.status(400).json({ message: 'Cannot ban deleted customer' });
    }
    
    // Calculate ban expiry date
    const banExpiry = duration ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;
    
    customer.isBanned = true;
    customer.banReason = reason || '';
    customer.banExpiry = banExpiry;
    customer.bannedBy = req.body.adminUsername || 'Admin';
    
    await customer.save();
    
    // Send ban email notification
    try {
      const banDuration = duration ? `${duration} ngày` : 'Vĩnh viễn';
      await sendBanEmail(
        customer.email,
        customer.username,
        reason || 'Vi phạm quy định nền tảng',
        banDuration,
        req.body.adminUsername || 'Admin'
      );
      console.log(`Ban email sent to customer ${customer.username} (${customer.email})`);
    } catch (emailError) {
      console.error('Error sending ban email:', emailError);
      // Don't fail the ban operation if email fails
    }
    
    res.json({ 
      message: 'Customer banned successfully', 
      customer: {
        ...customer.toObject(),
        isCurrentlyBanned: true
      }
    });
  } catch (error) {
    console.error('Error banning customer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Unban customer (admin)
app.post('/api/admin/customers/:id/unban', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    customer.isBanned = false;
    customer.banReason = '';
    customer.banExpiry = null;
    customer.bannedBy = '';
    
    await customer.save();
    
    // Send unban email notification
    try {
      await sendUnbanEmail(
        customer.email,
        customer.username,
        req.body.adminUsername || 'Admin'
      );
      console.log(`Unban email sent to customer ${customer.username} (${customer.email})`);
    } catch (emailError) {
      console.error('Error sending unban email:', emailError);
      // Don't fail the unban operation if email fails
    }
    
    res.json({ 
      message: 'Customer unbanned successfully', 
      customer: {
        ...customer.toObject(),
        isCurrentlyBanned: false
      }
    });
  } catch (error) {
    console.error('Error unbanning customer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Delete customer account (admin)
app.delete('/api/admin/customers/:id', async (req, res) => {
  try {
    const { reason } = req.body;
    const customer = await Customer.findById(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    if (customer.isDeleted) {
      return res.status(400).json({ message: 'Customer already deleted' });
    }
    
    // Soft delete - mark as deleted instead of actually removing
    customer.isDeleted = true;
    customer.deletedAt = new Date();
    customer.deletedBy = req.body.adminUsername || 'Admin';
    
    // Also ban them to prevent login
    customer.isBanned = true;
    customer.banReason = reason || 'Account deleted by admin';
    customer.banExpiry = null; // Permanent ban
    
    await customer.save();
    
    res.json({ 
      message: 'Customer account deleted successfully',
      customer: {
        ...customer.toObject(),
        isCurrentlyBanned: true
      }
    });
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get customer details (admin)
app.get('/api/admin/customers/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id)
      .select('-password -verificationCode -resetCode');
    
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    
    // Get customer's orders
    const orders = await Order.find({ 'customer.username': customer.username })
      .sort({ createdAt: -1 })
      .limit(10);
    
    // Calculate total spending
    const totalSpending = await Order.aggregate([
      { $match: { 'customer.username': customer.username } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      customer: {
        ...customer.toObject(),
        isCurrentlyBanned: customer.isBanned && (!customer.banExpiry || new Date() < customer.banExpiry)
      },
      recentOrders: orders,
      totalSpending: totalSpending.length > 0 ? totalSpending[0].total : 0,
      orderCount: orders.length
    });
  } catch (error) {
    console.error('Error fetching customer details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== END CUSTOMER MANAGEMENT ENDPOINTS =====

// ===== NOTIFICATION MANAGEMENT ENDPOINTS =====

// API: Get all notifications (admin)
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    
    let query = {};
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    // Remove expired notifications
    await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Mark notification as read
app.post('/api/admin/notifications/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification marked as read', notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Mark all notifications as read
app.post('/api/admin/notifications/read-all', async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );
    
    res.json({ 
      message: 'All notifications marked as read', 
      updatedCount: result.modifiedCount 
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Delete notification
app.delete('/api/admin/notifications/:id', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndDelete(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Clear all notifications
app.delete('/api/admin/notifications', async (req, res) => {
  try {
    const result = await Notification.deleteMany({});
    
    res.json({ 
      message: 'All notifications cleared', 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get unread notifications count
app.get('/api/admin/notifications/unread-count', async (req, res) => {
  try {
    const count = await Notification.countDocuments({ isRead: false });
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== END NOTIFICATION MANAGEMENT ENDPOINTS =====

// ===== NOTIFICATION HELPER FUNCTIONS =====

// Helper function to create notifications
async function createNotification(type, title, message, data = {}, priority = 'medium', expiresAt = null) {
  try {
    const notification = new Notification({
      type,
      title,
      message,
      data,
      priority,
      expiresAt
    });
    
    await notification.save();
    console.log(`Notification created: ${type} - ${title}`);
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

// ===== END NOTIFICATION HELPER FUNCTIONS =====

// ===== NOTIFICATION MANAGEMENT ENDPOINTS =====

// API: Create notification (for demo/testing)
app.post('/api/admin/notifications', async (req, res) => {
  try {
    const { type, title, message, data, priority, expiresAt } = req.body;
    
    const notification = new Notification({
      type,
      title,
      message,
      data,
      priority,
      expiresAt
    });
    
    await notification.save();
    res.status(201).json({ message: 'Notification created successfully', notification });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get all notifications (admin)
app.get('/api/admin/notifications', async (req, res) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;
    
    let query = {};
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    // Remove expired notifications
    await Notification.deleteMany({
      expiresAt: { $lt: new Date() }
    });
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Get designer info for a design
app.get('/api/designs/:designId/designer', async (req, res) => {
  try {
    const design = await Design.findOne({ designId: req.params.designId });
    if (!design) return res.status(404).json({ message: 'Design not found' });
    const designer = await Designer.findOne({ username: design.username });
    if (!designer) {
      return res.json({
        username: design.username,
        name: design.username,
        email: ''
      });
    }
    res.json({
      username: designer.username,
      name: designer.name,
      email: designer.email
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ===== DESIGNER PAYOUT ENDPOINTS =====

// GET: All designers with payout info
app.get('/api/admin/designer-payouts', adminAuthMiddleware, async (req, res) => {
  try {
    const designers = await Designer.find({ isDeleted: false })
      .select('-password -verificationCode -resetCode')
      .sort({ createdAt: -1 });

    const designersWithPayouts = await Promise.all(designers.map(async (designer) => {
      // Get all PAID orders for this designer that are not yet paid out
      const unpaidOrders = await Order.find({
        'designer.username': designer.username,
        status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] },
        designerPayoutStatus: 'unpaid',
      });
      const paidOrders = await Order.find({
        'designer.username': designer.username,
        status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] },
        designerPayoutStatus: 'paid',
      });
      
      // Calculate totals using productTotal (excluding shipping fees)
      const totalUnpaid = unpaidOrders.reduce((sum, o) => {
        const productAmount = o.productTotal !== undefined ? o.productTotal : o.amount;
        return sum + (productAmount || 0);
      }, 0);
      const totalPaid = paidOrders.reduce((sum, o) => {
        const productAmount = o.productTotal !== undefined ? o.productTotal : o.amount;
        return sum + (productAmount || 0);
      }, 0);
      
      return {
        username: designer.username,
        name: designer.name,
        email: designer.email,
        avatar: designer.avatar,
        totalUnpaid,
        totalPaid,
        yoursShare: Math.round(totalUnpaid * 0.6),
        designerShare: Math.round(totalUnpaid * 0.4),
        payoutStatus: totalUnpaid > 0 ? 'unpaid' : 'paid',
        designCount: await Design.countDocuments({ username: designer.username }),
      };
    }));
    res.json(designersWithPayouts);
  } catch (error) {
    console.error('Error fetching designer payouts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Mark all eligible orders for a designer as paid
app.post('/api/admin/designer-payouts/:designerUsername/pay', adminAuthMiddleware, async (req, res) => {
  try {
    const { designerUsername } = req.params;
    // Find all PAID orders for this designer that are not yet paid out
    const result = await Order.updateMany({
      'designer.username': designerUsername,
      status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] },
      designerPayoutStatus: 'unpaid',
    }, {
      $set: { designerPayoutStatus: 'paid' }
    });
    res.json({ message: 'Designer marked as paid', updatedCount: result.modifiedCount });
  } catch (error) {
    console.error('Error marking designer as paid:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API lấy thống kê của designer
app.get('/api/designer/stats', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    
    // Get designer's approved designs
    const approvedDesigns = await Design.find({ 
      username, 
      status: 'approved' 
    });
    
    // Get orders for designer's designs
    const designerOrders = await Order.find({
      'designer.username': username,
      status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] }
    });
    
    // Calculate stats
    const totalDesigns = approvedDesigns.length;
    const totalOrders = designerOrders.length;
    
    // Calculate revenue (40% of product totals, excluding shipping fees)
    const totalRevenue = designerOrders.reduce((sum, order) => {
      // Use productTotal if available, otherwise fall back to amount (for backward compatibility)
      const productAmount = order.productTotal !== undefined ? order.productTotal : order.amount;
      return sum + (productAmount * 0.4);
    }, 0);
    
    // Get withdrawal transactions
    const withdrawals = await Withdrawal.find({ 
      designerUsername: username,
      status: 'completed'
    });
    
    const totalWithdrawn = withdrawals.reduce((sum, withdrawal) => {
      return sum + withdrawal.amount;
    }, 0);
    
    // Available amount for withdrawal
    const availableAmount = Math.max(0, totalRevenue - totalWithdrawn);
    
    res.status(200).json({
      totalRevenue: Math.round(totalRevenue),
      totalOrders,
      totalDesigns,
      totalWithdrawn: Math.round(totalWithdrawn),
      availableAmount: Math.round(availableAmount)
    });
    
  } catch (error) {
    console.error('Lỗi khi lấy thống kê designer:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy thống kê', error: error.message });
  }
});

// API lấy lịch sử giao dịch rút tiền của designer
app.get('/api/designer/transactions', verifyToken, async (req, res) => {
  try {
    const username = req.user.username;
    
    const transactions = await Withdrawal.find({ 
      designerUsername: username 
    }).sort({ createdAt: -1 }).limit(10);
    
    res.status(200).json(transactions);
    
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử giao dịch:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi lấy lịch sử giao dịch', error: error.message });
  }
});

// API rút tiền cho designer
app.post('/api/designer/withdraw', verifyToken, async (req, res) => {
  console.log('=== WITHDRAWAL REQUEST RECEIVED ===');
  console.log('Request body:', req.body);
  console.log('User:', req.user);
  
  try {
    const username = req.user.username;
    const { method, accountInfo, accountName, bankName, amount } = req.body;
    
    // Validation
    if (!method || !accountInfo || !accountName || !amount) {
      return res.status(400).json({ message: 'Thiếu thông tin cần thiết' });
    }
    
    // Validate bank name for bank transfers
    if (method === 'bank' && !bankName) {
      return res.status(400).json({ message: 'Vui lòng chọn ngân hàng' });
    }
    
    if (amount < 50000) {
      return res.status(400).json({ message: 'Số tiền rút tối thiểu là 50,000₫' });
    }
    
    // Check available amount
    const designerOrders = await Order.find({
      'designer.username': username,
      status: { $in: ['PAID', 'DESIGN_IN_PROGRESS', 'DESIGN_APPROVED', 'COMPLETED', 'DELIVERED', 'DELIVERED_FINAL'] }
    });
    
    const totalRevenue = designerOrders.reduce((sum, order) => {
      // Use productTotal if available, otherwise fall back to amount (for backward compatibility)
      const productAmount = order.productTotal !== undefined ? order.productTotal : order.amount;
      return sum + (productAmount * 0.4);
    }, 0);
    
    const withdrawals = await Withdrawal.find({ 
      designerUsername: username,
      status: 'completed'
    });
    
    const totalWithdrawn = withdrawals.reduce((sum, withdrawal) => {
      return sum + withdrawal.amount;
    }, 0);
    
    const availableAmount = Math.max(0, totalRevenue - totalWithdrawn);
    
    if (amount > availableAmount) {
      return res.status(400).json({ message: 'Số tiền rút vượt quá số tiền có thể rút' });
    }
    
    // Create withdrawal transaction
    const transactionId = 'WD' + Date.now() + Math.random().toString(36).substr(2, 5).toUpperCase();
    
    const withdrawal = new Withdrawal({
      transactionId,
      designerUsername: username,
      method,
      accountInfo,
      accountName,
      bankName: bankName || '',
      amount,
      status: 'pending',
      createdAt: new Date()
    });
    
    await withdrawal.save();
    
    // Create notification for admin
    const methodDisplay = method === 'bank' ? `ngân hàng ${bankName}` : method;
    await createNotification(
      'payment',
      'Yêu cầu rút tiền mới',
      `Designer ${username} yêu cầu rút ${amount.toLocaleString('vi-VN')}₫ qua ${methodDisplay}`,
      { 
        designerUsername: username, 
        amount, 
        method, 
        accountInfo, 
        bankName,
        transactionId 
      },
      'high'
    );
    
    res.status(200).json({
      message: 'Yêu cầu rút tiền đã được gửi',
      transactionId,
      withdrawal
    });
    
  } catch (error) {
    console.error('Lỗi khi rút tiền:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi rút tiền', error: error.message });
  }
});

// ===== WITHDRAWAL MANAGEMENT ENDPOINTS =====

// GET: All withdrawal requests (admin)
app.get('/api/admin/withdrawals', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    const withdrawals = await Withdrawal.find(query)
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json(withdrawals);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Process withdrawal request (admin)
app.post('/api/admin/withdrawals/:transactionId/process', adminAuthMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status, notes, paymentImage } = req.body;
    const adminUsername = req.user.username;
    const withdrawal = await Withdrawal.findOne({ transactionId });
    if (!withdrawal) {
      return res.status(404).json({ message: 'Withdrawal request not found' });
    }
    
    // Get designer information for email notification
    const designer = await Designer.findOne({ username: withdrawal.designerUsername });
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    
    withdrawal.status = status;
    withdrawal.notes = notes || '';
    if (paymentImage) {
      withdrawal.paymentImage = paymentImage;
    }
    if (status === 'completed') {
      withdrawal.processedBy = adminUsername;
      withdrawal.processedAt = new Date();
    }
    await withdrawal.save();
    
    // Send email notification based on status
    try {
      const withdrawalData = {
        transactionId: withdrawal.transactionId,
        amount: withdrawal.amount,
        method: withdrawal.method,
        accountInfo: withdrawal.accountInfo,
        accountName: withdrawal.accountName,
        bankName: withdrawal.bankName
      };
      
      if (status === 'completed') {
        await sendWithdrawalCompletedEmail(
          designer.email, 
          designer.name || designer.username, 
          withdrawalData
        );
      } else if (status === 'failed') {
        await sendWithdrawalFailedEmail(
          designer.email, 
          designer.name || designer.username, 
          withdrawalData, 
          notes || 'Không xác định'
        );
      }
    } catch (emailError) {
      console.error('Error sending withdrawal email notification:', emailError);
      // Don't fail the request if email fails
    }
    
    // Create notification for designer
    await createNotification(
      'payment',
      'Cập nhật yêu cầu rút tiền',
      `Yêu cầu rút tiền ${withdrawal.amount.toLocaleString('vi-VN')}₫ của bạn đã được ${status === 'completed' ? 'hoàn thành' : status === 'failed' ? 'từ chối' : 'cập nhật'}`,
      { 
        transactionId,
        amount: withdrawal.amount,
        status,
        notes 
      },
      'medium'
    );
    
    res.json({ 
      message: 'Withdrawal request processed successfully',
      withdrawal 
    });
    
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET: Withdrawal statistics (admin)
app.get('/api/admin/withdrawal-stats', adminAuthMiddleware, async (req, res) => {
  try {
    const totalWithdrawals = await Withdrawal.countDocuments();
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const completedWithdrawals = await Withdrawal.countDocuments({ status: 'completed' });
    const failedWithdrawals = await Withdrawal.countDocuments({ status: 'failed' });
    
    const totalAmount = await Withdrawal.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    const pendingAmount = await Withdrawal.aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    res.json({
      totalWithdrawals,
      pendingWithdrawals,
      completedWithdrawals,
      failedWithdrawals,
      totalAmount: totalAmount[0]?.total || 0,
      pendingAmount: pendingAmount[0]?.total || 0
    });
    
  } catch (error) {
    console.error('Error fetching withdrawal stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST: Cancel withdrawal request (designer)
app.post('/api/designer/withdrawals/:transactionId/cancel', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const username = req.user.username;
    
    // Find the withdrawal request
    const withdrawal = await Withdrawal.findOne({ 
      transactionId,
      designerUsername: username 
    });
    
    if (!withdrawal) {
      return res.status(404).json({ message: 'Không tìm thấy yêu cầu rút tiền' });
    }
    
    // Check if withdrawal can be cancelled (only pending withdrawals)
    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        message: 'Chỉ có thể hủy yêu cầu rút tiền đang chờ xử lý' 
      });
    }
    
    // Update withdrawal status to cancelled
    withdrawal.status = 'cancelled';
    withdrawal.updatedAt = new Date();
    await withdrawal.save();
    
    // Create notification for admin
    await createNotification(
      'payment',
      'Yêu cầu rút tiền bị hủy',
      `Designer ${username} đã hủy yêu cầu rút tiền ${withdrawal.amount.toLocaleString('vi-VN')}₫`,
      { 
        designerUsername: username, 
        amount: withdrawal.amount, 
        transactionId,
        method: withdrawal.method,
        accountInfo: withdrawal.accountInfo
      },
      'medium'
    );
    
    res.json({ 
      message: 'Hủy yêu cầu rút tiền thành công',
      withdrawal 
    });
    
  } catch (error) {
    console.error('Error cancelling withdrawal:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ khi hủy yêu cầu rút tiền', error: error.message });
  }
});

// API: Get order count for a design (only paid and onwards)
const { PAID_STATUSES } = require('./models/Order');
app.get('/api/orders/count', async (req, res) => {
  try {
    const { designId } = req.query;
    if (!designId) return res.status(400).json({ message: 'Missing designId' });

    // Find all orders with paid status and containing this designId
    const orders = await Order.find({
      status: { $in: PAID_STATUSES },
      'items.productId': designId
    });

    // Count total quantity of this design in all orders
    let count = 0;
    orders.forEach(order => {
      order.items.forEach(item => {
        if (item.productId === designId) {
          count += item.quantity || 1;
        }
      });
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public API: Get designer info by username
app.get('/api/designers/:username', async (req, res) => {
  try {
    const designer = await Designer.findOne({ username: req.params.username }).select('-password -verificationCode -resetCode');
    if (!designer) {
      return res.status(404).json({ message: 'Designer not found' });
    }
    res.json(designer);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// API: Change username and/or password
app.post('/api/change-credentials', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const { newUsername, currentPassword, newPassword } = req.body;
    const Model = role === 'customer' ? Customer : Designer;
    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }
    // Change username if provided
    let oldUsername = user.username;
    if (newUsername && newUsername !== user.username) {
      // Check if username is taken in both models
      const existingCustomer = await Customer.findOne({ username: newUsername });
      const existingDesigner = await Designer.findOne({ username: newUsername });
      if ((role === 'customer' && existingCustomer) || (role === 'designer' && existingDesigner) || (role === 'customer' && existingDesigner) || (role === 'designer' && existingCustomer)) {
        return res.status(400).json({ message: 'Tên đăng nhập đã được sử dụng.' });
      }
      user.username = newUsername;
    }
    // Change password if provided
    if (newPassword) {
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt ($,#,@,+,-,=,?,!).' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }
    await user.save();
    // If designer username changed, update all their designs and reviews
    if (role === 'designer' && newUsername && newUsername !== oldUsername) {
      await Design.updateMany({ username: oldUsername }, { $set: { username: newUsername } });
      await Review.updateMany({ username: oldUsername }, { $set: { username: newUsername } });
    }
    res.status(200).json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('Error in /api/change-credentials:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// API: Change password only (remove username change)
app.post('/api/change-credentials', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const { newUsername, currentPassword, newPassword } = req.body;
    const Model = role === 'customer' ? Customer : Designer;
    const user = await Model.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng.' });
    }
    // Do not allow username change
    if (newUsername && newUsername !== user.username) {
      return res.status(400).json({ message: 'Không thể đổi tên đăng nhập.' });
    }
    // Change password if provided
    if (newPassword) {
      if (!isStrongPassword(newPassword)) {
        return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt ($,#,@,+,-,=,?,!).' });
      }
      user.password = await bcrypt.hash(newPassword, 10);
    }
    await user.save();
    res.status(200).json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    console.error('Error in /api/change-credentials:', error);
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});