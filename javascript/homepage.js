function toggleDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
  } else {
    dropdown.classList.add('show');
  }
}

// Clear currentUser and token on logout
window.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('a[href="choose-login.html"], .logout-btn').forEach(link => {
    link.addEventListener('click', function() {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('token');
    });
  });
});