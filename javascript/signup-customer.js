document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/signup-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, confirmPassword }),
    });

    const data = await response.json();
    
    // Tạo và hiển thị notification box
    const notificationBox = document.createElement('div');
    notificationBox.className = 'notification-box';
    notificationBox.textContent = data.message;
    document.body.appendChild(notificationBox);
    setTimeout(() => notificationBox.style.display = 'block', 10);

    if (response.status === 201) {
      let currentEmail = email;
      console.log("Stored email for verification:", currentEmail); // Debug log

      // Hiển thị modal xác thực
      document.getElementById('verificationModal').style.display = 'flex';
      setTimeout(() => notificationBox.remove(), 1500); // Xóa box sau 1.5 giây

      // Xử lý form xác thực
      document.getElementById('verification-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentEmail) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Không tìm thấy email của tài khoản. Vui lòng đăng ký lại.';
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 1500);
          return;
        }

        const verificationCode = document.getElementById('verificationCode').value;
        const requestBody = { email: currentEmail, verificationCode };
        console.log("Sending verification request with body:", requestBody); // Debug log

        try {
          const response = await fetch('https://yours-fashion.vercel.app/api/verify-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log("Verification response:", data); // Debug log

          const verifyBox = document.createElement('div');
          verifyBox.className = 'notification-box';
          verifyBox.textContent = data.message;
          document.body.appendChild(verifyBox);
          setTimeout(() => verifyBox.style.display = 'block', 10);

          if (response.status === 200) {
            setTimeout(() => {
              verifyBox.remove();
              document.getElementById('verificationModal').style.display = 'none';
              window.location.href = 'signin-customer.html'; // Chuyển hướng sau khi xác thực
            }, 1500);
          } else {
            setTimeout(() => verifyBox.remove(), 1500);
          }
        } catch (error) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Lỗi: ' + error.message;
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 1500);
        }
      });

      // Hàm gửi lại mã xác thực
      window.resendVerificationCode = async () => {
        if (!currentEmail) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Không tìm thấy email của tài khoản. Vui lòng đăng ký lại.';
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 1500);
          return;
        }

        const requestBody = { email: currentEmail };
        console.log("Resending verification code with body:", requestBody); // Debug log

        try {
          const response = await fetch('https://yours-fashion.vercel.app/api/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log("Resend verification response:", data); // Debug log

          const resendBox = document.createElement('div');
          resendBox.className = 'notification-box';
          resendBox.textContent = data.message;
          document.body.appendChild(resendBox);
          setTimeout(() => resendBox.style.display = 'block', 10);
          setTimeout(() => resendBox.remove(), 1500);
        } catch (error) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Lỗi: ' + error.message;
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 1500);
        }
      };
    } else {
      setTimeout(() => notificationBox.remove(), 1500);
    }
  } catch (error) {
    const errorBox = document.createElement('div');
    errorBox.className = 'notification-box';
    errorBox.textContent = 'Lỗi: ' + error.message;
    document.body.appendChild(errorBox);
    setTimeout(() => errorBox.style.display = 'block', 10);
    setTimeout(() => errorBox.remove(), 1500);
  }
});