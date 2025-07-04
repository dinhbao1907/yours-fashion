document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/signup-designer', {
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
      console.log("Stored email for verification:", currentEmail);

      // Hiển thị modal xác thực
      document.getElementById('verificationModal').style.display = 'flex';
      setTimeout(() => notificationBox.remove(), 2000); // Xóa box sau 2 giây

      document.getElementById('verification-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentEmail) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Không tìm thấy email của tài khoản. Vui lòng đăng ký lại.';
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 2500);
          return;
        }

        const verificationCode = document.getElementById('verificationCode').value;
        const requestBody = { email: currentEmail, verificationCode };
        console.log("Sending verification request with body:", requestBody);

        try {
          const response = await fetch('https://yours-fashion.vercel.app/api/verify-designer-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log("Verification response:", data);

          const verifyBox = document.createElement('div');
          verifyBox.className = 'notification-box';
          verifyBox.textContent = data.message;
          document.body.appendChild(verifyBox);
          setTimeout(() => verifyBox.style.display = 'block', 10);

          if (response.status === 200) {
            setTimeout(() => {
              verifyBox.remove();
              document.getElementById('verificationModal').style.display = 'none';
              window.location.href = 'signin-designer.html';
            }, 2000);
          } else {
            setTimeout(() => verifyBox.remove(), 2500);
          }
        } catch (error) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Lỗi: ' + error.message;
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 2500);
        }
      });

      window.resendVerificationCode = async () => {
        if (!currentEmail) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Không tìm thấy email của tài khoản. Vui lòng đăng ký lại.';
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 2500);
          return;
        }

        const requestBody = { email: currentEmail };
        console.log("Resending verification code with body:", requestBody);

        try {
          const response = await fetch('https://yours-fashion.vercel.app/api/resend-designer-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
          });

          const data = await response.json();
          console.log("Resend verification response:", data);

          const resendBox = document.createElement('div');
          resendBox.className = 'notification-box';
          resendBox.textContent = data.message;
          document.body.appendChild(resendBox);
          setTimeout(() => resendBox.style.display = 'block', 10);
          setTimeout(() => resendBox.remove(), 2500);
        } catch (error) {
          const errorBox = document.createElement('div');
          errorBox.className = 'notification-box';
          errorBox.textContent = 'Lỗi: ' + error.message;
          document.body.appendChild(errorBox);
          setTimeout(() => errorBox.style.display = 'block', 10);
          setTimeout(() => errorBox.remove(), 2500);
        }
      };
    } else {
      setTimeout(() => notificationBox.remove(), 2500);
    }
  } catch (error) {
    const errorBox = document.createElement('div');
    errorBox.className = 'notification-box';
    errorBox.textContent = 'Lỗi: ' + error.message;
    document.body.appendChild(errorBox);
    setTimeout(() => errorBox.style.display = 'block', 10);
    setTimeout(() => errorBox.remove(), 2500);
  }
});