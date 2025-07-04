// Xử lý chọn vai trò
const roleButtons = document.querySelectorAll('.role-btn');
const roleInput = document.getElementById('role');

roleButtons.forEach(button => {
  button.addEventListener('click', () => {
    roleButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    roleInput.value = button.getAttribute('data-role');
  });
});

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

// Xử lý gửi email để nhận mã xác nhận
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const role = document.getElementById('role').value;

  if (!role) {
    alert('Vui lòng chọn loại tài khoản.');
    return;
  }

  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role }),
    });

    const data = await response.json();
    alert(data.message);

    if (response.status === 200) {
      document.getElementById('forgot-password-form').style.display = 'none';
      document.getElementById('reset-password-form').style.display = 'block';
    }
  } catch (error) {
    console.error('Error sending forgot password request:', error);
    alert('Lỗi: ' + (error.message || 'Không thể gửi yêu cầu. Vui lòng thử lại.'));
  }
});

// Xử lý đặt lại mật khẩu
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const role = document.getElementById('role').value;
  const code = document.getElementById('code').value;
  const newPassword = document.getElementById('new-password').value;

  if (!email || !code || !newPassword) {
    alert('Vui lòng điền đầy đủ thông tin.');
    return;
  }

  // Kiểm tra độ mạnh mật khẩu
  if (!isStrongPassword(newPassword)) {
    alert('Mật khẩu phải có ít nhất 6 ký tự và bao gồm chữ hoa, chữ thường, số, và ký tự đặc biệt ($,#,@,+,-,=,?,!).');
    return;
  }

  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role, code, newPassword }),
    });

    const data = await response.json();
    alert(data.message);

    if (response.status === 200) {
      window.location.href = 'choose-login.html';
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    alert('Lỗi: ' + (error.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.'));
  }
});