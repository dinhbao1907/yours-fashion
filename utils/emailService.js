const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

// Cấu hình transporter với các options chi tiết
const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: "official.yours.fashiondesign@gmail.com",
    pass: "hmmm hssm lfip xhxe", // Thay bằng mật khẩu ứng dụng nếu bật 2FA
  },
  tls: {
    rejectUnauthorized: false, // Chấp nhận chứng chỉ tự ký (khuyến nghị xóa nếu không cần thiết)
  },
});

// Kiểm tra kết nối email
transporter.verify(function (error, success) {
  if (error) {
    console.log("Email configuration error:", error);
  } else {
    console.log("Email server is ready to send messages at", new Date());
  }
});

// Function to convert logo to base64
function getLogoBase64() {
  try {
    const logoPath = path.join(__dirname, 'resources', 'logo.png');
    console.log('Attempting to read logo from:', logoPath);
    
    // Check if file exists
    if (!fs.existsSync(logoPath)) {
      console.error('Logo file does not exist at:', logoPath);
      return null;
    }
    
    const logoBuffer = fs.readFileSync(logoPath);
    const base64String = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    console.log('Logo loaded successfully. Base64 length:', base64String.length);
    return base64String;
  } catch (error) {
    console.error('Error reading logo file:', error);
    console.error('Current directory:', __dirname);
    // Fallback to a simple text logo if file can't be read
    return null;
  }
}

// Get logo base64 once at startup
const logoBase64 = getLogoBase64();

// Log logo loading status
if (logoBase64) {
  console.log('✅ YOURS logo loaded successfully for email templates');
} else {
  console.log('⚠️  YOURS logo could not be loaded, using text fallback');
}

// Hàm gửi email xác nhận đăng ký (chào mừng)
async function sendRegistrationEmail(email, username) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: "Chào mừng đến với YOURS - Xác nhận đăng ký tài khoản",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
                    <h2 style="color: #333;">Chào mừng đến với YOURS!</h2>
                    <p>Xin chào ${username},</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại YOURS. Tài khoản của bạn đã được tạo thành công.</p>
                    <p>Bạn có thể bắt đầu sử dụng các dịch vụ của chúng tôi ngay bây giờ.</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0;">Tên đăng nhập: <strong>${username}</strong></p>
                        <p style="margin: 10px 0 0 0;">Email: <strong>${email}</strong></p>
                    </div>
                    <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
                    <p>Trân trọng,<br>Đội ngũ YOURS</p>
                </div>
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Registration email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending registration email:", error);
    throw new Error(`Failed to send registration email: ${error.message}`);
  }
}

// Hàm gửi email đặt lại mật khẩu
async function sendPasswordResetEmail(email, resetCode) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: "YOURS - Mã xác nhận đặt lại mật khẩu",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
                    <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                    <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p>Mã xác nhận của bạn là:</p>
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
                        <h1 style="margin: 0; color: #007bff;">${resetCode}</h1>
                    </div>
                    <p>Mã này sẽ hết hạn sau 30 phút.</p>
                    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                    <p>Trân trọng,<br>Đội ngũ YOURS</p>
                </div>
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Password reset email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error(`Failed to send password reset email: ${error.message}`);
  }
}

// Hàm gửi email xác nhận tài khoản
async function sendVerificationEmail(email, username, verificationCode) {
  try {
    console.log(
      "Sending verification email to:",
      email,
      "with code:",
      verificationCode,
      "at",
      new Date()
    ); // Debug log

    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: "YOURS - Mã xác nhận tài khoản của bạn",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
                    <h2 style="color: #333; text-align: center;">Xác nhận tài khoản YOURS</h2>
                    <p>Xin chào ${username},</p>
                    <p>Cảm ơn bạn đã đăng ký tài khoản tại YOURS. Để hoàn tất quá trình đăng ký, vui lòng sử dụng mã xác nhận sau:</p>
                    
                    <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; margin: 30px 0; text-align: center; border: 2px dashed #007bff;">
                        <p style="margin: 0 0 15px 0; color: #666; font-size: 16px;">Mã xác nhận của bạn:</p>
                        <h1 style="margin: 0; color: #007bff; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${verificationCode}</h1>
                    </div>

                    <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 0; color: #856404;">
                            <strong>Lưu ý:</strong> Mã này sẽ hết hạn sau 30 phút.
                        </p>
                    </div>

                    <p>Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <p style="margin: 0; color: #666;">Trân trọng,<br>Đội ngũ YOURS</p>
                    </div>
                </div>
            `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error(`Failed to send verification email: ${error.message}`);
  }
}

// Gửi email khi thiết kế được duyệt
async function sendDesignApprovedEmail(email, designerName, designName, designDetails = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Thiết kế "${designName}" của bạn đã được duyệt!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #333;">Chúc mừng ${designerName || ''}!</h2>
          <p>Thiết kế của bạn đã được duyệt và sẽ xuất hiện trên hệ thống YOURS.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #4CAF50; margin-top: 0;">Chi tiết thiết kế đã duyệt:</h3>
            <p><strong>Tên thiết kế:</strong> ${designName}</p>
            ${designDetails.description ? `<p><strong>Mô tả:</strong> ${designDetails.description}</p>` : ''}
            ${designDetails.productType ? `<p><strong>Loại sản phẩm:</strong> ${designDetails.productType}</p>` : ''}
            ${designDetails.material ? `<p><strong>Chất liệu:</strong> ${designDetails.material}</p>` : ''}
            ${designDetails.price ? `<p><strong>Giá bán:</strong> ${designDetails.price.toLocaleString('vi-VN')}₫</p>` : ''}
            ${designDetails.productCode ? `<p><strong>Mã sản phẩm:</strong> ${designDetails.productCode}</p>` : ''}
          </div>
          
          <p>Thiết kế của bạn giờ đây có thể được khách hàng xem và mua trên nền tảng YOURS.</p>
          <p>Cảm ơn bạn đã đóng góp cho cộng đồng YOURS!</p>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>💡 Lời khuyên:</strong> Hãy tiếp tục tạo ra những thiết kế chất lượng để thu hút nhiều khách hàng hơn!
            </p>
          </div>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Design approved email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending design approved email:", error);
    throw new Error(`Failed to send design approved email: ${error.message}`);
  }
}

// Gửi email khi thiết kế bị từ chối
async function sendDesignRejectedEmail(email, designerName, designName, reason, designDetails = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Thiết kế "${designName}" của bạn đã bị từ chối`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #e74c3c;">Rất tiếc, ${designerName || ''}!</h2>
          <p>Thiết kế của bạn đã bị từ chối sau khi được xem xét bởi đội ngũ YOURS.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #e74c3c; margin-top: 0;">Chi tiết thiết kế bị từ chối:</h3>
            <p><strong>Tên thiết kế:</strong> ${designName}</p>
            ${designDetails.description ? `<p><strong>Mô tả:</strong> ${designDetails.description}</p>` : ''}
            ${designDetails.productType ? `<p><strong>Loại sản phẩm:</strong> ${designDetails.productType}</p>` : ''}
            ${designDetails.material ? `<p><strong>Chất liệu:</strong> ${designDetails.material}</p>` : ''}
            ${designDetails.price ? `<p><strong>Giá bán:</strong> ${designDetails.price.toLocaleString('vi-VN')}₫</p>` : ''}
            ${designDetails.productCode ? `<p><strong>Mã sản phẩm:</strong> ${designDetails.productCode}</p>` : ''}
            ${reason ? `<p><strong>Lý do từ chối:</strong> ${reason}</p>` : ''}
          </div>
          
          <p>Vui lòng xem xét lại thiết kế của bạn và đảm bảo tuân thủ các tiêu chuẩn của YOURS.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>💡 Lời khuyên:</strong> Hãy tham khảo các thiết kế đã được duyệt để hiểu rõ hơn về tiêu chuẩn của chúng tôi.
            </p>
          </div>
          
          <p>Bạn có thể tạo thiết kế mới và gửi lại bất cứ lúc nào.</p>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Design rejected email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending design rejected email:", error);
    throw new Error(`Failed to send design rejected email: ${error.message}`);
  }
}

// Gửi email khi rút tiền thành công
async function sendWithdrawalCompletedEmail(email, designerName, withdrawalData) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Yêu cầu rút tiền ${withdrawalData.transactionId} đã được xử lý thành công!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #4CAF50;">Chúc mừng ${designerName || ''}!</h2>
          <p>Yêu cầu rút tiền của bạn đã được xử lý thành công.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #4CAF50; margin-top: 0;">Chi tiết giao dịch:</h3>
            <p><strong>Mã giao dịch:</strong> ${withdrawalData.transactionId}</p>
            <p><strong>Số tiền:</strong> ${withdrawalData.amount.toLocaleString('vi-VN')}₫</p>
            <p><strong>Phương thức:</strong> ${withdrawalData.method === 'bank' ? 'Chuyển khoản ngân hàng' : 'Ví điện tử'}</p>
            <p><strong>Thông tin tài khoản:</strong> ${withdrawalData.accountInfo}</p>
            ${withdrawalData.bankName ? `<p><strong>Ngân hàng:</strong> ${withdrawalData.bankName}</p>` : ''}
            <p><strong>Ngày xử lý:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          
          <p>Số tiền sẽ được chuyển đến tài khoản của bạn trong vòng 1-3 ngày làm việc.</p>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>✅ Xác nhận:</strong> Giao dịch đã được xử lý thành công và đang được chuyển đến tài khoản của bạn.
            </p>
          </div>
          
          <p>Nếu bạn có bất kỳ câu hỏi nào, đừng ngần ngại liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Withdrawal completed email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending withdrawal completed email:", error);
    throw new Error(`Failed to send withdrawal completed email: ${error.message}`);
  }
}

// Gửi email khi rút tiền thất bại
async function sendWithdrawalFailedEmail(email, designerName, withdrawalData, reason) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Yêu cầu rút tiền ${withdrawalData.transactionId} không thể được xử lý`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #e74c3c;">Rất tiếc, ${designerName || ''}!</h2>
          <p>Yêu cầu rút tiền của bạn không thể được xử lý.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #e74c3c; margin-top: 0;">Chi tiết giao dịch:</h3>
            <p><strong>Mã giao dịch:</strong> ${withdrawalData.transactionId}</p>
            <p><strong>Số tiền:</strong> ${withdrawalData.amount.toLocaleString('vi-VN')}₫</p>
            <p><strong>Phương thức:</strong> ${withdrawalData.method === 'bank' ? 'Chuyển khoản ngân hàng' : 'Ví điện tử'}</p>
            <p><strong>Thông tin tài khoản:</strong> ${withdrawalData.accountInfo}</p>
            ${withdrawalData.bankName ? `<p><strong>Ngân hàng:</strong> ${withdrawalData.bankName}</p>` : ''}
            <p><strong>Lý do thất bại:</strong> ${reason || 'Không xác định'}</p>
          </div>
          
          <p>Số tiền đã được hoàn lại vào tài khoản YOURS của bạn và bạn có thể thử rút tiền lại.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>⚠️ Lưu ý:</strong> Vui lòng kiểm tra lại thông tin tài khoản và thử lại. Nếu vấn đề vẫn tiếp tục, hãy liên hệ với chúng tôi.
            </p>
          </div>
          
          <p>Nếu bạn cần hỗ trợ, đừng ngần ngại liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Withdrawal failed email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending withdrawal failed email:", error);
    throw new Error(`Failed to send withdrawal failed email: ${error.message}`);
  }
}

// Gửi email khi đơn hàng đã thanh toán
async function sendOrderPaidEmail(email, customerName, orderCode, orderDetails = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Đơn hàng ${orderCode} đã thanh toán thành công!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #333;">Cảm ơn bạn ${customerName || ''}!</h2>
          <p>Đơn hàng của bạn đã được thanh toán thành công và đang được xử lý.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #28a745; margin-top: 0;">Thông tin đơn hàng:</h3>
            <p><strong>Mã đơn hàng:</strong> ${orderCode}</p>
            ${orderDetails.amount ? `<p><strong>Tổng tiền:</strong> ${orderDetails.amount.toLocaleString('vi-VN')}₫</p>` : ''}
            ${orderDetails.items ? `<p><strong>Số sản phẩm:</strong> ${orderDetails.items.length}</p>` : ''}
            <p><strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">Đã thanh toán</span></p>
          </div>
          
          <p>Chúng tôi sẽ bắt đầu xử lý đơn hàng của bạn ngay lập tức.</p>
          <p>Bạn sẽ nhận được email thông báo khi đơn hàng được giao.</p>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>📦 Tiếp theo:</strong> Đơn hàng của bạn sẽ được chuyển sang giai đoạn thiết kế và sản xuất.
            </p>
          </div>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Order paid email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending order paid email:", error);
    throw new Error(`Failed to send order paid email: ${error.message}`);
  }
}

// Gửi email khi đơn hàng đang giao
async function sendOrderDeliveringEmail(email, customerName, orderCode, orderDetails = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Đơn hàng ${orderCode} đang được giao!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #333;">Xin chào ${customerName || ''}!</h2>
          <p>Đơn hàng của bạn đã được hoàn thành và đang được giao đến bạn.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color: #ffc107; margin-top: 0;">Thông tin đơn hàng:</h3>
            <p><strong>Mã đơn hàng:</strong> ${orderCode}</p>
            ${orderDetails.amount ? `<p><strong>Tổng tiền:</strong> ${orderDetails.amount.toLocaleString('vi-VN')}₫</p>` : ''}
            ${orderDetails.items ? `<p><strong>Số sản phẩm:</strong> ${orderDetails.items.length}</p>` : ''}
            <p><strong>Trạng thái:</strong> <span style="color: #ffc107; font-weight: bold;">Đang giao</span></p>
          </div>
          
          <p>Đơn hàng của bạn đang trên đường đến bạn. Vui lòng chuẩn bị nhận hàng.</p>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>🚚 Lưu ý:</strong> Vui lòng kiểm tra kỹ sản phẩm trước khi ký nhận và đánh giá sản phẩm sau khi nhận hàng.
            </p>
          </div>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Order delivering email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending order delivering email:", error);
    throw new Error(`Failed to send order delivering email: ${error.message}`);
  }
}

// Gửi email khi đơn hàng đã giao thành công
async function sendOrderDeliveredEmail(email, customerName, orderCode, orderDetails = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Đơn hàng ${orderCode} đã được giao thành công!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #333;">Chúc mừng ${customerName || ''}!</h2>
          <p>Đơn hàng của bạn đã được giao thành công. Cảm ơn bạn đã tin tưởng YOURS!</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #28a745; margin-top: 0;">Thông tin đơn hàng:</h3>
            <p><strong>Mã đơn hàng:</strong> ${orderCode}</p>
            ${orderDetails.amount ? `<p><strong>Tổng tiền:</strong> ${orderDetails.amount.toLocaleString('vi-VN')}₫</p>` : ''}
            ${orderDetails.items ? `<p><strong>Số sản phẩm:</strong> ${orderDetails.items.length}</p>` : ''}
            <p><strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">Đã giao thành công</span></p>
          </div>
          
          <p>Chúng tôi hy vọng bạn hài lòng với sản phẩm của YOURS!</p>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>⭐ Đánh giá:</strong> Hãy dành chút thời gian đánh giá sản phẩm để giúp chúng tôi cải thiện dịch vụ!
            </p>
          </div>
          
          <p>Nếu bạn có bất kỳ câu hỏi nào về sản phẩm, đừng ngần ngại liên hệ với chúng tôi.</p>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Order delivered email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending order delivered email:", error);
    throw new Error(`Failed to send order delivered email: ${error.message}`);
  }
}

// Gửi email khi user bị cấm
async function sendBanEmail(email, username, banReason, banDuration, adminUsername) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: "Tài khoản YOURS của bạn đã bị cấm",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #e74c3c;">Thông báo quan trọng</h2>
          <p>Xin chào ${username},</p>
          <p>Tài khoản YOURS của bạn đã bị cấm do vi phạm các quy định của nền tảng.</p>
          
          <div style="background-color: #fff5f5; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #e74c3c; margin-top: 0;">Chi tiết lệnh cấm:</h3>
            <p><strong>Lý do:</strong> ${banReason || 'Vi phạm quy định nền tảng'}</p>
            <p><strong>Thời hạn:</strong> ${banDuration || 'Vĩnh viễn'}</p>
            <p><strong>Người thực hiện:</strong> ${adminUsername || 'Hệ thống'}</p>
            <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
          </div>
          
          <p>Trong thời gian bị cấm, bạn sẽ không thể:</p>
          <ul style="color: #666; margin: 20px 0;">
            <li>Đăng nhập vào tài khoản</li>
            <li>Truy cập các dịch vụ của YOURS</li>
            <li>Thực hiện các giao dịch</li>
          </ul>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #856404;">
              <strong>📞 Liên hệ:</strong> Nếu bạn cho rằng đây là sự nhầm lẫn hoặc muốn khiếu nại, vui lòng liên hệ với chúng tôi qua email hoặc hotline.
            </p>
          </div>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Ban email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending ban email:", error);
    throw new Error(`Failed to send ban email: ${error.message}`);
  }
}

// Gửi email khi user được bỏ cấm
async function sendUnbanEmail(email, username, adminUsername) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: "Tài khoản YOURS của bạn đã được bỏ cấm",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          ${logoBase64 ? `<img src="${logoBase64}" alt="YOURS Logo" style="max-width: 200px; margin: 20px 0;">` : '<h1 style="color: #5B22D4; margin: 20px 0;">YOURS</h1>'}
          <h2 style="color: #28a745;">Chào mừng trở lại!</h2>
          <p>Xin chào ${username},</p>
          <p>Tài khoản YOURS của bạn đã được bỏ cấm và bạn có thể sử dụng lại các dịch vụ của chúng tôi.</p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #28a745;">
            <h3 style="color: #28a745; margin-top: 0;">Thông tin bỏ cấm:</h3>
            <p><strong>Người thực hiện:</strong> ${adminUsername || 'Hệ thống'}</p>
            <p><strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN')}</p>
            <p><strong>Trạng thái:</strong> <span style="color: #28a745; font-weight: bold;">Đã bỏ cấm</span></p>
          </div>
          
          <p>Bạn giờ đây có thể:</p>
          <ul style="color: #666; margin: 20px 0;">
            <li>Đăng nhập vào tài khoản bình thường</li>
            <li>Sử dụng tất cả dịch vụ của YOURS</li>
            <li>Thực hiện các giao dịch</li>
          </ul>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #2e7d32;">
              <strong>✅ Khôi phục:</strong> Tài khoản của bạn đã được khôi phục hoàn toàn. Vui lòng tuân thủ các quy định của nền tảng để tránh bị cấm trong tương lai.
            </p>
          </div>
          
          <p>Cảm ơn bạn đã kiên nhẫn chờ đợi.</p>
          
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Unban email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending unban email:", error);
    throw new Error(`Failed to send unban email: ${error.message}`);
  }
}

// Gửi email cho khách hàng khi thiết kế tùy chỉnh được duyệt
async function sendCustomDesignApprovedEmail(email, customerName, orderCode, customDesign = {}) {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Thiết kế tùy chỉnh của bạn đã được duyệt!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">Chúc mừng ${customerName || ''}!</h2>
          <p>Thiết kế tùy chỉnh trong đơn hàng <b>${orderCode}</b> của bạn đã được duyệt và sẽ được chuyển sang giai đoạn sản xuất.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #4CAF50;">
            <h3 style="color: #4CAF50; margin-top: 0;">Chi tiết thiết kế:</h3>
            <p><strong>Loại:</strong> ${customDesign.designType || ''}</p>
            <p><strong>Size:</strong> ${customDesign.size || ''}</p>
            <p><strong>Số lượng:</strong> ${customDesign.quantity || 1}</p>
          </div>
          <p>Cảm ơn bạn đã sử dụng dịch vụ của YOURS!</p>
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Custom design approved email sent to customer:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending custom design approved email to customer:", error);
    throw new Error(`Failed to send custom design approved email: ${error.message}`);
  }
}

// Gửi email cho khách hàng khi thiết kế tùy chỉnh bị từ chối
async function sendCustomDesignRejectedEmail(email, customerName, orderCode, customDesign = {}, reason = '') {
  try {
    const mailOptions = {
      from: {
        name: "YOURS Fashion Design",
        address: "official.yours.fashiondesign@gmail.com",
      },
      to: email,
      subject: `Thiết kế tùy chỉnh của bạn đã bị từ chối!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e74c3c;">Rất tiếc, ${customerName || ''}!</h2>
          <p>Thiết kế tùy chỉnh trong đơn hàng <b>${orderCode}</b> của bạn đã bị từ chối.</p>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #e74c3c;">
            <h3 style="color: #e74c3c; margin-top: 0;">Chi tiết thiết kế:</h3>
            <p><strong>Loại:</strong> ${customDesign.designType || ''}</p>
            <p><strong>Size:</strong> ${customDesign.size || ''}</p>
            <p><strong>Số lượng:</strong> ${customDesign.quantity || 1}</p>
            ${reason ? `<p><strong>Lý do từ chối:</strong> ${reason}</p>` : ''}
          </div>
          <p>Bạn có thể chỉnh sửa lại thiết kế và gửi lại bất cứ lúc nào.</p>
          <p>Trân trọng,<br>Đội ngũ YOURS</p>
        </div>
      `,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Custom design rejected email sent to customer:", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending custom design rejected email to customer:", error);
    throw new Error(`Failed to send custom design rejected email: ${error.message}`);
  }
}

module.exports = {
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
};