document.getElementById('signin-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const usernameOrEmail = document.getElementById('usernameOrEmail').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/signin-designer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrEmail, password }),
    });

    const data = await response.json();

    // Tạo và hiển thị notification box
    const notificationBox = document.createElement('div');
    notificationBox.className = 'notification-box';
    notificationBox.textContent = data.message;
    document.body.appendChild(notificationBox);
    setTimeout(() => notificationBox.style.display = 'block', 10);

    if (response.status === 200) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", data.username);
      localStorage.setItem("currentUserName", data.name || "");
      localStorage.setItem("currentUserEmail", data.email || "");
      // Chuyển hướng sau 1.5 giây (thời gian fadeOut)
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      setTimeout(() => notificationBox.remove(), 1500);
    }
  } catch (error) {
    // Hiển thị lỗi trong notification box
    const notificationBox = document.createElement('div');
    notificationBox.className = 'notification-box';
    notificationBox.textContent = 'Error: ' + error.message;
    document.body.appendChild(notificationBox);
    setTimeout(() => notificationBox.style.display = 'block', 10);
    setTimeout(() => notificationBox.remove(), 1500);
  }
});