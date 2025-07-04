// Admin Dashboard JS
// Fetch and render all dashboard data, handle actions, auto-update

// Check admin authentication
function checkAdminAuth() {
  const adminToken = localStorage.getItem('adminToken');
  const adminInfo = localStorage.getItem('adminInfo');
  
  if (!adminToken || !adminInfo) {
    // Redirect to admin login if not authenticated
    window.location.href = 'admin-login.html';
    return false;
  }
  
  try {
    const admin = JSON.parse(adminInfo);
    // Update admin info in sidebar header if needed
    const sidebarHeader = document.querySelector('.sidebar-header div');
    if (sidebarHeader) {
      sidebarHeader.textContent = `Quản trị viên YOURS - ${admin.name || admin.username}`;
    }
    return true;
  } catch (error) {
    console.error('Error parsing admin info:', error);
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    window.location.href = 'admin-login.html';
    return false;
  }
}

// Admin logout function
function adminLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminInfo');
    window.location.href = 'admin-login.html';
  }
}

// Add logout button to sidebar
function addLogoutButton() {
  const sidebar = document.querySelector('.sidebar');
  if (sidebar) {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'action-btn';
    logoutBtn.style.cssText = 'margin: 24px; background: #e74c3c; color: white; width: calc(100% - 48px);';
    logoutBtn.textContent = 'Đăng xuất';
    logoutBtn.onclick = adminLogout;
    
    // Add to the bottom of sidebar
    sidebar.appendChild(logoutBtn);
  }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', function() {
  if (!checkAdminAuth()) {
    return;
  }
  
  addLogoutButton();
  loadDashboard();
});

// Update all fetch calls to include admin token
function getAuthHeaders() {
  const adminToken = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`
  };
}

// Helper: format currency
function formatVND(amount) {
  return amount.toLocaleString('vi-VN') + '₫';
}

// Helper: check if response is JSON and array
function safeJsonArray(response) {
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return null;
    }
    if (response.status === 404) {
      return 'notfound';
    }
    return null;
  }
  return response.json().then(data => Array.isArray(data) ? data : []);
}

// Fetch and render dashboard stats
async function loadStats(filter = 'month') {
  try {
    const cards = document.querySelectorAll('.dashboard-card-value');
    cards.forEach(card => {
      card.classList.add('loading');
      card.textContent = '...';
    });
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/stats?filter=${filter}`, {
      headers: getAuthHeaders()
    });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return;
    }
    const stats = await res.json();
    cards.forEach(card => {
      card.classList.remove('loading');
    });
    animateValue('revenue', 0, stats.revenue || 0, 1000, formatVND);
    animateValue('ordersCount', 0, stats.orders || 0, 800);
    animateValue('customersCount', 0, stats.customers || 0, 800);
    animateValue('designersCount', 0, stats.designers || 0, 800);
    animateValue('productsCount', 0, stats.products || 0, 800);
  } catch (error) {
    console.error('Error loading stats:', error);
    const cards = document.querySelectorAll('.dashboard-card-value');
    cards.forEach(card => {
      card.classList.remove('loading');
    });
  }
}

// Helper function to animate number values
function animateValue(elementId, start, end, duration, formatter = (val) => val) {
  const element = document.getElementById(elementId);
  if (!element) return;
  
  const startTime = performance.now();
  const difference = end - start;
  
  function updateValue(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing function for smooth animation
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const currentValue = start + (difference * easeOutQuart);
    
    element.textContent = formatter(Math.floor(currentValue));
    
    if (progress < 1) {
      requestAnimationFrame(updateValue);
    }
  }
  
  requestAnimationFrame(updateValue);
}

// Fetch and render recent orders
async function loadRecentOrders(filter = 'month') {
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/orders?limit=5&filter=${filter}`, {
      headers: getAuthHeaders()
    });
    const orders = await safeJsonArray(res);
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;
    if (orders === 'notfound') {
      tbody.innerHTML = '<tr><td colspan="7">Không tìm thấy dữ liệu đơn hàng.</td></tr>';
      return;
    }
    if (!orders || !Array.isArray(orders)) {
      tbody.innerHTML = '<tr><td colspan="7">Không thể tải đơn hàng.</td></tr>';
      return;
    }
    tbody.innerHTML = '';
    orders.forEach(order => {
      // Get product images - show both custom design and store products if both exist
      let productImages = '';
      let allProducts = [];
      
      // Add custom design if exists
      if (order.customDesign && order.customDesign.designImage) {
        allProducts.push({
          type: 'custom',
          image: order.customDesign.designImage,
          name: 'Thiết kế tùy chỉnh'
        });
      }
      
      // Add store products if exist
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          allProducts.push({
            type: 'store',
            image: item.image,
            name: item.name
          });
        });
      }
      
      if (allProducts.length === 0) {
        productImages = '<span style="color:#bbb;font-size:12px;">(N/A)</span>';
      } else if (allProducts.length === 1) {
        // Single product
        const product = allProducts[0];
        productImages = product.image ? 
          `<img src="${product.image}" alt="${product.name}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;">` :
          '<span style="color:#bbb;font-size:12px;">(N/A)</span>';
      } else {
        // Multiple products - show first 3 images with count
        const images = allProducts.slice(0, 3).map(product => 
          product.image ? 
            `<img src="${product.image}" alt="${product.name}" style="width:32px;height:32px;object-fit:cover;border-radius:4px;border:1px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.1);">` :
            `<div style="width:32px;height:32px;background:#f0f0f0;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#999;">N/A</div>`
        ).join('');
        productImages = `
          <div style="display:flex;gap:2px;align-items:center;">
            ${images}
            ${allProducts.length > 3 ? `<span style="font-size:11px;color:#7B3FF2;font-weight:bold;margin-left:4px;">+${allProducts.length - 3}</span>` : ''}
          </div>
        `;
      }

      // Get product names - show both custom design and store products
      let productNames = '';
      
      if (allProducts.length === 0) {
        productNames = 'Không có thông tin';
      } else if (allProducts.length === 1) {
        const product = allProducts[0];
        if (product.type === 'custom') {
          productNames = `🎨 ${product.name}`;
        } else {
          productNames = product.name;
        }
      } else {
        const names = allProducts.slice(0, 2).map(product => {
          if (product.type === 'custom') {
            return `🎨 ${product.name}`;
          } else {
            return product.name;
          }
        }).join(', ');
        productNames = allProducts.length > 2 ? 
          `${names} +${allProducts.length - 2} sản phẩm khác` : 
          names;
      }

      tbody.innerHTML += `
        <tr>
          <td>${order.orderCode || order.id || ''}</td>
          <td style="display:flex;align-items:center;gap:8px;">
            ${productImages}
            <div style="font-size:12px;max-width:120px;">
              <div style="font-weight:500;">${productNames}</div>
            </div>
          </td>
          <td>${order.customer?.name || order.customer?.username || order.username || ''}</td>
          <td class="order-status ${order.status}">${getStatusText(order.status)}</td>
          <td>${order.amount ? formatVND(order.amount) : ''}</td>
          <td>${new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
          <td>
            <button class="action-btn" style="background:#eee;color:#7B3FF2;font-size:11px;padding:4px 8px;" onclick="viewOrderProductDetails('${order.id}')">Chi tiết</button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7">Lỗi khi tải đơn hàng.</td></tr>';
    console.error('Error loading recent orders:', error);
  }
}

// Fetch and render designs for approval
async function loadDesigns() {
  try {
    const res = await fetch('https://yours-fashion.vercel.app/api/admin/designs', {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return;
    }
    
    let designs = await res.json();
    // Sort by createdAt, newest first
    designs = designs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // Store all designs for search
    window._allDesigns = designs;
    renderDesignsTable(designs);
    document.getElementById('pendingDesignsBadge').textContent = designs.filter(d => d.status === 'pending').length;
  } catch (error) {
    console.error('Error loading designs:', error);
  }
}

function renderDesignsTable(designs) {
  const tbody = document.querySelector('#designsTable tbody');
  tbody.innerHTML = '';
  
  designs.forEach((design, index) => {
    if (design.status === 'draft') return;
    let statusText = '';
    if (design.status === 'approved') statusText = 'Đã duyệt';
    else if (design.status === 'pending') statusText = 'Chờ duyệt';
    else if (design.status === 'rejected') statusText = 'Đã từ chối';
    const disabled = design.status !== 'pending' ? 'disabled' : '';
    const rowStyle = design.status === 'pending' ? 'style="background:#fffbe6;"' : '';
    let imgTag = design.designImage ? `<img src="${design.designImage}" alt="Design Image" class="design-thumb" style="width:96px;height:96px;object-fit:cover;border-radius:8px;cursor:pointer;">` : '';
    
    const row = document.createElement('tr');
    row.style.animationDelay = `${index * 0.1}s`;
    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    row.innerHTML = `
      <td>${imgTag}</td>
      <td>${design.name}</td>
      <td>${design.description || ''}</td>
      <td>${formatVND(design.price)}</td>
      <td>${design.username || ''}</td>
      <td>${statusText}</td>
      <td>
        <button class="action-btn approve" onclick="approveDesign('${design._id || design.id}')" ${disabled}>Duyệt</button>
        <button class="action-btn reject" onclick="rejectDesign('${design._id || design.id}')" ${disabled}>Từ chối</button>
        <button class="action-btn" style="background:#eee;color:#7B3FF2;" onclick="editDesign('${design._id || design.id}')">Sửa</button>
      </td>
    `;
    
    tbody.appendChild(row);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      row.style.transition = 'all 0.4s ease-out';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, index * 100);
  });
  
  // Add click event for all design images
  setTimeout(() => {
    document.querySelectorAll('.design-thumb').forEach(img => {
      img.addEventListener('click', function() {
        const modal = document.getElementById('imageModal');
        const modalImg = document.getElementById('modalImg');
        modalImg.src = this.src;
        modalImg.style.transform = 'scale(1)';
        modalImg.setAttribute('data-scale', '1');
        modalImg.style.cursor = 'grab';
        modal.style.display = 'flex';
      });
    });
  }, designs.length * 100 + 100);
}

// Fetch and render best sellers
async function loadBestSellers(filter = 'month') {
  const res = await fetch(`https://yours-fashion.vercel.app/api/admin/best-sellers?filter=${filter}`);
  const products = await res.json();
  const container = document.getElementById('bestSellers');
  container.innerHTML = '';
  products.forEach(product => {
    container.innerHTML += `
      <div class="product-item">
        <img src="${product.image}" alt="${product.name}" class="product-img">
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-price">${formatVND(product.price)}</div>
        </div>
      </div>
    `;
  });
}

// Fetch and render analytics (charts)
async function loadAnalytics(filter = 'month') {
  const res = await fetch(`https://yours-fashion.vercel.app/api/admin/analytics?filter=${filter}`);
  const data = await res.json();
  const ctx = document.getElementById('revenueChart').getContext('2d');
  if (window._revenueChartInstance) {
    window._revenueChartInstance.destroy();
  }
  window._revenueChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.revenue.labels,
      datasets: [{
        label: 'Doanh thu',
        data: data.revenue.values,
        borderColor: '#7B3FF2',
        backgroundColor: 'rgba(123,63,242,0.08)',
        fill: true,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return formatVND(value);
            }
          }
        }
      }
    }
  });
  // Order status chart
  const ctx2 = document.getElementById('orderStatusChart').getContext('2d');
  if (window._orderStatusChartInstance) {
    window._orderStatusChartInstance.destroy();
  }
  window._orderStatusChartInstance = new Chart(ctx2, {
    type: 'doughnut',
    data: {
      labels: data.orderStatus.labels,
      datasets: [{
        data: data.orderStatus.values,
        backgroundColor: ['#4CAF50', '#FFA500', '#e74c3c', '#7B3FF2', '#9C27B0']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

// Render order statistics cards and chart in the dashboard
async function loadOrderStats(filter = 'month') {
  // Fetch order stats from backend
  const res = await fetch(`https://yours-fashion.vercel.app/api/admin/order-stats?filter=${filter}`);
  const stats = await res.json();

  // Render mini-stat cards
  const cards = [
    { label: 'Tổng đơn', value: stats.totalOrders, color: '#7B3FF2' },
    { label: 'Đã hoàn thành', value: stats.completed, color: '#4CAF50' },
    { label: 'Đã hủy', value: stats.canceled, color: '#e74c3c' },
    { label: 'Đang xử lý', value: stats.inProgress, color: '#FFA500' },
    { label: 'Đã giao', value: stats.delivered, color: '#2196F3' },
    { label: 'Doanh thu', value: formatVND(stats.revenue), color: '#8A4AF3' }
  ];
  const cardsContainer = document.getElementById('orderStatsCards');
  cardsContainer.innerHTML = cards.map(card => `
    <div style="background:${card.color}10;padding:18px 24px;border-radius:14px;min-width:110px;text-align:center;box-shadow:0 2px 8px rgba(123,63,242,0.07);">
      <div style="font-size:1.2rem;font-weight:700;color:${card.color};">${card.value}</div>
      <div style="font-size:14px;color:#555;font-weight:600;">${card.label}</div>
    </div>
  `).join('');

  // Render chart (orders by day/month/year)
  const ctx = document.getElementById('orderStatsChart').getContext('2d');
  if (window._orderStatsChartInstance) {
    window._orderStatsChartInstance.destroy();
  }
  window._orderStatsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: stats.chart.labels,
      datasets: [{
        label: 'Số lượng đơn',
        data: stats.chart.values,
        backgroundColor: '#7B3FF2',
        borderRadius: 8,
        maxBarThickness: 32
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

// Update dashboard filter logic to include loadOrderStats
function reloadDashboardDataWithFilter(filter) {
  loadStats(filter);
  loadRecentOrders(filter);
  loadBestSellers(filter);
  loadAnalytics(filter);
  loadOrderStats(filter);
}

document.addEventListener('DOMContentLoaded', function() {
  const filter = document.getElementById('dashboardFilter');
  if (filter) {
    filter.addEventListener('change', function() {
      reloadDashboardDataWithFilter(this.value);
    });
    reloadDashboardDataWithFilter(filter.value);
  } else {
    reloadDashboardDataWithFilter('month');
  }
});

// Approve/reject actions
window.approveOrder = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${id}/approve`, { method: 'POST' });
  loadRecentOrders();
};
window.rejectOrder = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${id}/reject`, { method: 'POST' });
  loadRecentOrders();
};
window.approveDesign = async function(id) {
  try {
    const response = await fetch(`https://yours-fashion.vercel.app/api/admin/designs/${id}/approve`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      await loadDesigns();
    } else {
      alert('Có lỗi xảy ra khi duyệt thiết kế');
    }
  } catch (error) {
    console.error('Error approving design:', error);
    alert('Có lỗi xảy ra khi duyệt thiết kế');
  }
};
window.rejectDesign = function(id) {
  // Open modal to enter rejection reason
  document.getElementById('rejectReasonModal').style.display = 'flex';
  document.getElementById('rejectReasonForm').setAttribute('data-id', id);
  document.getElementById('rejectReasonInput').value = '';
};
window.completeOrder = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${id}/complete`, { method: 'POST' });
  loadAllOrders();
};
window.deliverOrder = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${id}/deliver`, { method: 'POST' });
};
window.finishOrder = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${id}/finish`, { method: 'POST' });
};

// Initial load
async function loadDashboard() {
  await loadStats();
  await loadRecentOrders();
  await loadAllOrders();
  await loadDesigns();
  await loadBestSellers();
  await loadAnalytics();
  await loadDesigners();
  await loadCustomers();
  
  // Create demo notification for testing
  await createDemoNotification();
}

// Debug function to check designs in database
async function debugDesigns() {
  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/admin/designs', {
      headers: getAuthHeaders()
    });
    
    if (response.ok) {
      const designs = await response.json();
      console.log('Total designs in database:', designs.length);
      console.log('Designs:', designs);
      
      const pendingDesigns = designs.filter(d => d.status === 'pending');
      const approvedDesigns = designs.filter(d => d.status === 'approved');
      const rejectedDesigns = designs.filter(d => d.status === 'rejected');
      
      console.log('Pending designs:', pendingDesigns.length);
      console.log('Approved designs:', approvedDesigns.length);
      console.log('Rejected designs:', rejectedDesigns.length);
      
      alert(`Tổng số designs: ${designs.length}\nChờ duyệt: ${pendingDesigns.length}\nĐã duyệt: ${approvedDesigns.length}\nĐã từ chối: ${rejectedDesigns.length}`);
    } else {
      alert('Có lỗi xảy ra khi lấy thông tin designs');
    }
  } catch (error) {
    console.error('Error debugging designs:', error);
    alert('Có lỗi xảy ra khi debug designs');
  }
}

// Auto-refresh recent orders and designs every 10 seconds
setInterval(() => {
  loadRecentOrders();
  loadDesigns();
  loadDesigners();
  loadCustomers();
}, 10000);

window.addEventListener('DOMContentLoaded', loadDashboard);

// Remove drag functionality and add static zoom buttons
window.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('imageModal');
  const closeModal = document.getElementById('closeModal');
  const modalImg = document.getElementById('modalImg');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  let scale = 1;

  zoomInBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.min(scale + 0.2, 5);
    modalImg.style.transform = `scale(${scale})`;
    modalImg.setAttribute('data-scale', scale);
  });
  zoomOutBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    scale = Math.max(scale - 0.2, 0.2);
    modalImg.style.transform = `scale(${scale})`;
    modalImg.setAttribute('data-scale', scale);
  });

  closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    modalImg.src = '';
    modalImg.style.transform = 'scale(1)';
    modalImg.setAttribute('data-scale', '1');
    scale = 1;
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
      modalImg.src = '';
      modalImg.style.transform = 'scale(1)';
      modalImg.setAttribute('data-scale', '1');
      scale = 1;
    }
  });
});

// Search functionality
window.addEventListener('DOMContentLoaded', () => {
  const searchBox = document.getElementById('designSearchBox');
  if (searchBox) {
    searchBox.addEventListener('input', function() {
      const val = this.value.trim().toLowerCase();
      const filtered = (window._allDesigns || []).filter(d => d.name && d.name.toLowerCase().includes(val));
      renderDesignsTable(filtered);
    });
  }
  
  // Designer search functionality
  const designerSearchBox = document.getElementById('designerSearchBox');
  if (designerSearchBox) {
    designerSearchBox.addEventListener('input', function() {
      const val = this.value.trim().toLowerCase();
      const filtered = (window._allDesigners || []).filter(d => 
        (d.username && d.username.toLowerCase().includes(val)) ||
        (d.email && d.email.toLowerCase().includes(val)) ||
        (d.name && d.name.toLowerCase().includes(val))
      );
      renderDesignersTable(filtered);
    });
  }
  
  // Customer search functionality
  const customerSearchBox = document.getElementById('customerSearchBox');
  if (customerSearchBox) {
    customerSearchBox.addEventListener('input', function() {
      const val = this.value.trim().toLowerCase();
      const filtered = (window._allCustomers || []).filter(c => 
        (c.username && c.username.toLowerCase().includes(val)) ||
        (c.email && c.email.toLowerCase().includes(val)) ||
        (c.name && c.name.toLowerCase().includes(val))
      );
      renderCustomersTable(filtered);
    });
  }
});

// Edit design logic
window.editDesign = function(id) {
  const design = (window._allDesigns || []).find(d => (d._id || d.id) === id);
  if (!design) return;
  document.getElementById('editDesignName').value = design.name || '';
  document.getElementById('editDesignDesc').value = design.description || '';
  document.getElementById('editDesignPrice').value = design.price || 0;
  document.getElementById('editDesignModal').style.display = 'flex';
  document.getElementById('editDesignForm').setAttribute('data-id', id);
};

// Modal close/cancel
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closeEditModal').onclick = () => {
    document.getElementById('editDesignModal').style.display = 'none';
  };
  document.getElementById('cancelEditBtn').onclick = () => {
    document.getElementById('editDesignModal').style.display = 'none';
  };
});

// Handle edit form submit
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('editDesignForm').onsubmit = async function(e) {
    e.preventDefault();
    const id = this.getAttribute('data-id');
    const name = document.getElementById('editDesignName').value.trim();
    const description = document.getElementById('editDesignDesc').value.trim();
    const price = parseInt(document.getElementById('editDesignPrice').value, 10);
    await fetch(`https://yours-fashion.vercel.app/api/admin/designs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, price })
    }).then(async res => {
      const data = await res.json();
      console.log('Edit design response:', data);
    }).catch(err => console.error('Edit design error:', err));
    document.getElementById('editDesignModal').style.display = 'none';
    // Refresh designs
    loadDesigns();
  };
});

// Modal close/cancel for reject reason
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('closeRejectModal').onclick = () => {
    document.getElementById('rejectReasonModal').style.display = 'none';
  };
  document.getElementById('cancelRejectBtn').onclick = () => {
    document.getElementById('rejectReasonModal').style.display = 'none';
  };
});

// Handle reject reason form submit
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rejectReasonForm').onsubmit = async function(e) {
    e.preventDefault();
    const id = this.getAttribute('data-id');
    const reason = document.getElementById('rejectReasonInput').value.trim();
    if (!reason) {
      alert('Vui lòng nhập lý do từ chối.');
      return;
    }
    
    try {
      const response = await fetch(`https://yours-fashion.vercel.app/api/admin/designs/${id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rejectionReason: reason })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Reject design response:', data);
        document.getElementById('rejectReasonModal').style.display = 'none';
        await loadDesigns();
      } else {
        alert('Có lỗi xảy ra khi từ chối thiết kế');
      }
    } catch (error) {
      console.error('Reject design error:', error);
      alert('Có lỗi xảy ra khi từ chối thiết kế');
    }
  };
});

// ===== DESIGNER MANAGEMENT FUNCTIONS =====

// Fetch and render designers
async function loadDesigners() {
  try {
    const res = await fetch('https://yours-fashion.vercel.app/api/admin/designers');
    const designers = await res.json();
    
    // Store all designers for search
    window._allDesigners = designers;
    renderDesignersTable(designers);
    document.getElementById('designersCountBadge').textContent = designers.length;
  } catch (error) {
    console.error('Error loading designers:', error);
    const tbody = document.querySelector('#designersTable tbody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#e74c3c;">Có lỗi xảy ra khi tải danh sách designer</td></tr>';
  }
}

function renderDesignersTable(designers) {
  const tbody = document.querySelector('#designersTable tbody');
  tbody.innerHTML = '';
  designers.forEach((designer, index) => {
    const status = getDesignerStatus(designer);
    const statusClass = getStatusClass(designer);
    const avatar = designer.avatar || 'resources/user-circle.png';
    const isBanned = !!designer.isCurrentlyBanned;
    const row = document.createElement('tr');
    row.className = statusClass;
    row.style.animationDelay = `${index * 0.1}s`;
    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    row.innerHTML = `
      <td><img src="${avatar}" alt="Avatar" class="designer-avatar"></td>
      <td>${designer.username}</td>
      <td>${designer.email}</td>
      <td>${designer.name || designer.firstName + ' ' + designer.lastName}</td>
      <td>${designer.designCount || 0}</td>
      <td><span class="designer-status ${statusClass}">${status}</span></td>
      <td>${new Date(designer.createdAt).toLocaleDateString('vi-VN')}</td>
      <td>
        <button class="action-btn" style="background:#7B3FF2;color:#fff;" onclick="viewDesignerDetails('${designer._id}')">Chi tiết</button>
        ${isBanned
          ? `<button class="action-btn" style="background:#4CAF50;color:#fff;" onclick="unbanDesigner('${designer._id}')">Bỏ cấm</button>`
          : `<button class="action-btn" style="background:#e74c3c;color:#fff;" onclick="banDesigner('${designer._id}')">Cấm</button>`
        }
        <button class="action-btn" style="background:#e74c3c;color:#fff;" onclick="deleteDesigner('${designer._id}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(row);
    setTimeout(() => {
      row.style.transition = 'all 0.4s ease-out';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, index * 100);
  });
  document.getElementById('designersCountBadge').textContent = designers.length;
}

function getDesignerStatus(designer) {
  if (designer.isDeleted) return 'Đã xóa';
  if (designer.isCurrentlyBanned) {
    if (designer.banExpiry) {
      const expiryDate = new Date(designer.banExpiry);
      const now = new Date();
      if (expiryDate > now) {
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return `Bị cấm (${daysLeft} ngày)`;
      }
    }
    return 'Bị cấm vĩnh viễn';
  }
  if (!designer.isVerified) return 'Chưa xác thực';
  return 'Hoạt động';
}

function getStatusClass(designer) {
  if (designer.isDeleted) return 'status-deleted';
  if (designer.isCurrentlyBanned) return 'status-banned';
  if (!designer.isVerified) return 'status-unverified';
  return 'status-active';
}

// Ban designer
async function banDesigner(designerId) {
  const designer = window._allDesigners.find(d => d._id === designerId);
  if (!designer) {
    alert('Không tìm thấy designer!');
    return;
  }
  // Show ban modal
  const modal = document.getElementById('banDesignerModal');
  if (!modal) {
    alert('Không tìm thấy modal cấm designer!');
    return;
  }
  const infoDiv = document.getElementById('banDesignerInfo');
  if (!infoDiv) {
    alert('Không tìm thấy phần thông tin designer trong modal!');
    return;
  }
  infoDiv.innerHTML = `
    <p><strong>Username:</strong> ${designer.username}</p>
    <p><strong>Email:</strong> ${designer.email}</p>
    <p><strong>Tên:</strong> ${designer.name || 'N/A'}</p>
  `;
  // Store designer ID for form submission
  modal.setAttribute('data-designer-id', designerId);
  modal.style.display = 'flex';
}

// Unban designer
async function unbanDesigner(designerId) {
  if (!confirm('Bạn có chắc chắn muốn bỏ cấm designer này?')) return;
  
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/designers/${designerId}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUsername: 'Admin' })
    });
    
    if (res.ok) {
      alert('Đã bỏ cấm designer thành công');
      loadDesigners();
    } else {
      const error = await res.json();
      alert('Lỗi: ' + error.message);
    }
  } catch (error) {
    console.error('Error unbanning designer:', error);
    alert('Có lỗi xảy ra khi bỏ cấm designer');
  }
}

// Delete designer
async function deleteDesigner(designerId) {
  const designer = window._allDesigners.find(d => d._id === designerId);
  if (!designer) return;
  
  // Show delete modal
  const modal = document.getElementById('deleteDesignerModal');
  const infoDiv = document.getElementById('deleteDesignerInfo');
  infoDiv.innerHTML = `
    <p><strong>Username:</strong> ${designer.username}</p>
    <p><strong>Email:</strong> ${designer.email}</p>
    <p><strong>Tên:</strong> ${designer.name || 'N/A'}</p>
    <p><strong>Số thiết kế:</strong> ${designer.designCount || 0}</p>
    <p><strong>Doanh thu:</strong> ${formatVND(designer.totalSales || 0)}</p>
  `;
  
  // Store designer ID for form submission
  modal.setAttribute('data-designer-id', designerId);
  modal.style.display = 'flex';
}

// View designer details
async function viewDesignerDetails(designerId) {
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/designers/${designerId}`);
    const data = await res.json();
    
    const designer = data.designer;
    const avatar = designer.avatar || 'resources/user-circle.png';
    const status = getDesignerStatus(designer);
    const statusClass = getStatusClass(designer);
    
    const detailsHTML = `
      <div style="display:flex;gap:24px;margin-bottom:24px;">
        <img src="${avatar}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #7B3FF2;">
        <div style="flex:1;">
          <h3 style="margin:0 0 8px 0;color:#23222a;">${designer.username}</h3>
          <p style="margin:0 0 4px 0;color:#666;">${designer.email}</p>
          <span class="designer-status ${statusClass}" style="margin-top:8px;display:inline-block;">
            ${status}
          </span>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;color:#7B3FF2;">Thông tin cá nhân</h4>
          <p style="margin:4px 0;"><strong>Tên:</strong> ${designer.name || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Số điện thoại:</strong> ${designer.phone || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Giới tính:</strong> ${designer.gender || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Ngày sinh:</strong> ${designer.dob ? new Date(designer.dob).toLocaleDateString('vi-VN') : 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Ngày tạo:</strong> ${new Date(designer.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;color:#7B3FF2;">Thống kê</h4>
          <p style="margin:4px 0;"><strong>Số thiết kế:</strong> ${data.designCount}</p>
          <p style="margin:4px 0;"><strong>Tổng doanh thu:</strong> ${formatVND(data.totalRevenue || data.designerShare || 0)}</p>
          <p style="margin:4px 0;"><strong>Trạng thái xác thực:</strong> ${designer.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p>
          ${designer.isCurrentlyBanned ? `<p style="margin:4px 0;"><strong>Lý do bị cấm:</strong> ${designer.banReason || 'N/A'}</p>` : ''}
        </div>
      </div>
      
      ${data.designs && data.designs.length > 0 ? `
        <div style="margin-bottom:24px;">
          <h4 style="margin:0 0 16px 0;color:#7B3FF2;">Thiết kế gần đây (${data.designs.length})</h4>
          <div style="max-height:200px;overflow-y:auto;">
            ${data.designs.slice(0, 5).map(design => `
              <div style="display:flex;align-items:center;gap:12px;padding:8px;border-bottom:1px solid #eee;">
                <img src="${design.designImage || 'resources/tshirt-model.png'}" alt="Design" style="width:40px;height:40px;border-radius:4px;object-fit:cover;">
                <div style="flex:1;">
                  <p style="margin:0;font-weight:600;">${design.name}</p>
                  <p style="margin:0;font-size:12px;color:#666;">${formatVND(design.price)} • ${design.productType}</p>
                </div>
                <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${design.status === 'approved' ? '#4CAF50' : design.status === 'pending' ? '#ffa500' : '#e74c3c'};color:#fff;">
                  ${design.status === 'approved' ? 'Đã duyệt' : design.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
      
      ${data.recentOrders && data.recentOrders.length > 0 ? `
        <div>
          <h4 style="margin:0 0 16px 0;color:#7B3FF2;">Đơn hàng gần đây (${data.recentOrders.length})</h4>
          <div style="max-height:200px;overflow-y:auto;">
            ${data.recentOrders.map(order => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #eee;">
                <div>
                  <p style="margin:0;font-weight:600;">${order.orderCode}</p>
                  <p style="margin:0;font-size:12px;color:#666;">${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                </div>
                <div style="text-align:right;">
                  <p style="margin:0;font-weight:600;">${formatVND(order.amount)}</p>
                  <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${order.status === 'PAID' ? '#4CAF50' : order.status === 'PENDING' ? '#ffa500' : '#e74c3c'};color:#fff;">
                    ${order.status === 'PAID' ? 'Đã thanh toán' : order.status === 'PENDING' ? 'Chờ thanh toán' : order.status}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
    
    // Show modal with details
    const modal = document.getElementById('designerDetailsModal');
    const contentDiv = document.getElementById('designerDetailsContent');
    contentDiv.innerHTML = detailsHTML;
    modal.style.display = 'flex';
    
    // Update dashboard revenue card to show selected designer's net revenue
    document.getElementById('revenue').textContent = formatVND(data.totalRevenue || data.designerShare || 0);
  } catch (error) {
    console.error('Error fetching designer details:', error);
    alert('Có lỗi xảy ra khi tải thông tin designer');
  }
}

// ===== END DESIGNER MANAGEMENT FUNCTIONS =====

// ===== CUSTOMER MANAGEMENT FUNCTIONS =====

// Fetch and render customers
async function loadCustomers() {
  try {
    const res = await fetch('https://yours-fashion.vercel.app/api/admin/customers');
    const customers = await res.json();
    
    // Store all customers for search
    window._allCustomers = customers;
    renderCustomersTable(customers);
    document.getElementById('customersCountBadge').textContent = customers.length;
  } catch (error) {
    console.error('Error loading customers:', error);
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#e74c3c;">Có lỗi xảy ra khi tải danh sách khách hàng</td></tr>';
  }
}

function renderCustomersTable(customers) {
  const tbody = document.querySelector('#customersTable tbody');
  tbody.innerHTML = '';
  customers.forEach((customer, index) => {
    const status = getCustomerStatus(customer);
    const statusClass = getCustomerStatusClass(customer);
    const avatar = customer.avatar || 'resources/user-circle.png';
    const isBanned = !!customer.isCurrentlyBanned;
    const row = document.createElement('tr');
    row.className = statusClass;
    row.style.animationDelay = `${index * 0.1}s`;
    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    row.innerHTML = `
      <td><img src="${avatar}" alt="Avatar" class="customer-avatar"></td>
      <td>${customer.username}</td>
      <td>${customer.email}</td>
      <td>${customer.name || customer.firstName + ' ' + customer.lastName}</td>
      <td>${customer.orderCount || 0}</td>
      <td>${formatVND(customer.totalSpent || 0)}</td>
      <td><span class="customer-status ${statusClass}">${status}</span></td>
      <td>${new Date(customer.createdAt).toLocaleDateString('vi-VN')}</td>
      <td>
        <button class="action-btn" style="background:#7B3FF2;color:#fff;" onclick="viewCustomerDetails('${customer._id}')">Chi tiết</button>
        ${isBanned
          ? `<button class="action-btn" style="background:#4CAF50;color:#fff;" onclick="unbanCustomer('${customer._id}')">Bỏ cấm</button>`
          : `<button class="action-btn" style="background:#e74c3c;color:#fff;" onclick="banCustomer('${customer._id}')">Cấm</button>`
        }
        <button class="action-btn" style="background:#e74c3c;color:#fff;" onclick="deleteCustomer('${customer._id}')">Xóa</button>
      </td>
    `;
    tbody.appendChild(row);
    setTimeout(() => {
      row.style.transition = 'all 0.4s ease-out';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

function getCustomerStatus(customer) {
  if (customer.isDeleted) return 'Đã xóa';
  if (customer.isCurrentlyBanned) {
    if (customer.banExpiry) {
      const expiryDate = new Date(customer.banExpiry);
      const now = new Date();
      if (expiryDate > now) {
        const daysLeft = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        return `Bị cấm (${daysLeft} ngày)`;
      }
    }
    return 'Bị cấm vĩnh viễn';
  }
  if (!customer.isVerified) return 'Chưa xác thực';
  return 'Hoạt động';
}

function getCustomerStatusClass(customer) {
  if (customer.isDeleted) return 'status-deleted';
  if (customer.isCurrentlyBanned) return 'status-banned';
  if (!customer.isVerified) return 'status-unverified';
  return 'status-active';
}

// Ban customer
async function banCustomer(customerId) {
  const customer = window._allCustomers.find(c => c._id === customerId);
  if (!customer) return;
  
  // Show ban modal
  const modal = document.getElementById('banCustomerModal');
  const infoDiv = document.getElementById('banCustomerInfo');
  infoDiv.innerHTML = `
    <p><strong>Username:</strong> ${customer.username}</p>
    <p><strong>Email:</strong> ${customer.email}</p>
    <p><strong>Tên:</strong> ${customer.name || 'N/A'}</p>
  `;
  
  // Store customer ID for form submission
  modal.setAttribute('data-customer-id', customerId);
  modal.style.display = 'flex';
}

// Unban customer
async function unbanCustomer(customerId) {
  if (!confirm('Bạn có chắc chắn muốn bỏ cấm khách hàng này?')) return;
  
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/customers/${customerId}/unban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminUsername: 'Admin' })
    });
    
    if (res.ok) {
      alert('Đã bỏ cấm khách hàng thành công');
      loadCustomers();
    } else {
      const error = await res.json();
      alert('Lỗi: ' + error.message);
    }
  } catch (error) {
    console.error('Error unbanning customer:', error);
    alert('Có lỗi xảy ra khi bỏ cấm khách hàng');
  }
}

// Delete customer
async function deleteCustomer(customerId) {
  const customer = window._allCustomers.find(c => c._id === customerId);
  if (!customer) return;
  
  // Show delete modal
  const modal = document.getElementById('deleteCustomerModal');
  const infoDiv = document.getElementById('deleteCustomerInfo');
  infoDiv.innerHTML = `
    <p><strong>Username:</strong> ${customer.username}</p>
    <p><strong>Email:</strong> ${customer.email}</p>
    <p><strong>Tên:</strong> ${customer.name || 'N/A'}</p>
    <p><strong>Số đơn hàng:</strong> ${customer.orderCount || 0}</p>
    <p><strong>Tổng chi tiêu:</strong> ${formatVND(customer.totalSpending || 0)}</p>
  `;
  
  // Store customer ID for form submission
  modal.setAttribute('data-customer-id', customerId);
  modal.style.display = 'flex';
}

// View customer details
async function viewCustomerDetails(customerId) {
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/customers/${customerId}`);
    const data = await res.json();
    
    const customer = data.customer;
    const avatar = customer.avatar || 'resources/user-circle.png';
    const status = getCustomerStatus(customer);
    const statusClass = getCustomerStatusClass(customer);
    
    const detailsHTML = `
      <div style="display:flex;gap:24px;margin-bottom:24px;">
        <img src="${avatar}" alt="Avatar" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #7B3FF2;">
        <div style="flex:1;">
          <h3 style="margin:0 0 8px 0;color:#23222a;">${customer.username}</h3>
          <p style="margin:0 0 4px 0;color:#666;">${customer.email}</p>
          <span class="customer-status ${statusClass}" style="margin-top:8px;display:inline-block;">
            ${status}
          </span>
        </div>
      </div>
      
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;color:#7B3FF2;">Thông tin cá nhân</h4>
          <p style="margin:4px 0;"><strong>Tên:</strong> ${customer.name || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Số điện thoại:</strong> ${customer.phone || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Giới tính:</strong> ${customer.gender || 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Ngày sinh:</strong> ${customer.dob ? new Date(customer.dob).toLocaleDateString('vi-VN') : 'N/A'}</p>
          <p style="margin:4px 0;"><strong>Ngày tạo:</strong> ${new Date(customer.createdAt).toLocaleDateString('vi-VN')}</p>
        </div>
        
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;color:#7B3FF2;">Thống kê mua hàng</h4>
          <p style="margin:4px 0;"><strong>Số đơn hàng:</strong> ${data.orderCount}</p>
          <p style="margin:4px 0;"><strong>Tổng chi tiêu:</strong> ${formatVND(data.totalSpending)}</p>
          <p style="margin:4px 0;"><strong>Trạng thái xác thực:</strong> ${customer.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}</p>
          ${customer.isCurrentlyBanned ? `<p style="margin:4px 0;"><strong>Lý do bị cấm:</strong> ${customer.banReason || 'N/A'}</p>` : ''}
        </div>
      </div>
      
      ${data.recentOrders && data.recentOrders.length > 0 ? `
        <div>
          <h4 style="margin:0 0 16px 0;color:#7B3FF2;">Đơn hàng gần đây (${data.recentOrders.length})</h4>
          <div style="max-height:300px;overflow-y:auto;">
            ${data.recentOrders.map(order => `
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #eee;">
                <div style="flex:1;">
                  <p style="margin:0;font-weight:600;">${order.orderCode}</p>
                  <p style="margin:4px 0;font-size:12px;color:#666;">${new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                  <p style="margin:0;font-size:12px;color:#666;">${order.items ? order.items.length + ' sản phẩm' : 'N/A'}</p>
                </div>
                <div style="text-align:right;">
                  <p style="margin:0;font-weight:600;">${formatVND(order.amount)}</p>
                  <span style="padding:2px 8px;border-radius:4px;font-size:11px;background:${order.status === 'PAID' ? '#4CAF50' : order.status === 'PENDING' ? '#ffa500' : '#e74c3c'};color:#fff;">
                    ${order.status === 'PAID' ? 'Đã thanh toán' : order.status === 'PENDING' ? 'Chờ thanh toán' : order.status}
                  </span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '<p style="text-align:center;color:#666;font-style:italic;">Chưa có đơn hàng nào</p>'}
    `;
    
    // Show modal with details
    const modal = document.getElementById('customerDetailsModal');
    const contentDiv = document.getElementById('customerDetailsContent');
    contentDiv.innerHTML = detailsHTML;
    modal.style.display = 'flex';
    
  } catch (error) {
    console.error('Error fetching customer details:', error);
    alert('Có lỗi xảy ra khi tải thông tin khách hàng');
  }
}

// ===== END CUSTOMER MANAGEMENT FUNCTIONS =====

// ===== DESIGNER MANAGEMENT MODAL EVENT LISTENERS =====

// Ban designer modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const banModal = document.getElementById('banDesignerModal');
  const closeBanModal = document.getElementById('closeBanModal');
  const cancelBanBtn = document.getElementById('cancelBanBtn');
  const banForm = document.getElementById('banDesignerForm');
  
  closeBanModal.onclick = () => {
    banModal.style.display = 'none';
  };
  
  cancelBanBtn.onclick = () => {
    banModal.style.display = 'none';
  };
  
  banForm.onsubmit = async function(e) {
    e.preventDefault();
    const designerId = banModal.getAttribute('data-designer-id');
    const reason = document.getElementById('banReasonInput').value.trim();
    const duration = parseInt(document.getElementById('banDurationInput').value, 10);
    
    if (!reason) {
      alert('Vui lòng nhập lý do cấm.');
      return;
    }
    
    try {
      const res = await fetch(`https://yours-fashion.vercel.app/api/admin/designers/${designerId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason, 
          duration,
          adminUsername: 'Admin'
        })
      });
      
      if (res.ok) {
        alert('Đã cấm designer thành công');
        banModal.style.display = 'none';
        loadDesigners();
      } else {
        const error = await res.json();
        alert('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Error banning designer:', error);
      alert('Có lỗi xảy ra khi cấm designer');
    }
  };
});

// Delete designer modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const deleteModal = document.getElementById('deleteDesignerModal');
  const closeDeleteModal = document.getElementById('closeDeleteModal');
  const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
  const deleteForm = document.getElementById('deleteDesignerForm');
  
  closeDeleteModal.onclick = () => {
    deleteModal.style.display = 'none';
  };
  
  cancelDeleteBtn.onclick = () => {
    deleteModal.style.display = 'none';
  };
  
  deleteForm.onsubmit = async function(e) {
    e.preventDefault();
    const designerId = deleteModal.getAttribute('data-designer-id');
    const reason = document.getElementById('deleteReasonInput').value.trim();
    
    if (!reason) {
      alert('Vui lòng nhập lý do xóa.');
      return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn designer này? Hành động này không thể hoàn tác!')) {
      return;
    }
    
    try {
      const res = await fetch(`https://yours-fashion.vercel.app/api/admin/designers/${designerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason,
          adminUsername: 'Admin'
        })
      });
      
      if (res.ok) {
        alert('Đã xóa designer thành công');
        deleteModal.style.display = 'none';
        loadDesigners();
      } else {
        const error = await res.json();
        alert('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Error deleting designer:', error);
      alert('Có lỗi xảy ra khi xóa designer');
    }
  };
});

// Designer details modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const detailsModal = document.getElementById('designerDetailsModal');
  const closeDetailsModal = document.getElementById('closeDetailsModal');
  const closeDetailsBtn = document.getElementById('closeDetailsBtn');
  
  closeDetailsModal.onclick = () => {
    detailsModal.style.display = 'none';
  };
  
  closeDetailsBtn.onclick = () => {
    detailsModal.style.display = 'none';
  };
  
  // Close modal when clicking outside
  detailsModal.onclick = (e) => {
    if (e.target === detailsModal) {
      detailsModal.style.display = 'none';
    }
  };
});

// ===== END DESIGNER MANAGEMENT MODAL EVENT LISTENERS =====

// ===== CUSTOMER MANAGEMENT MODAL EVENT LISTENERS =====

// Ban customer modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const banCustomerModal = document.getElementById('banCustomerModal');
  const closeBanCustomerModal = document.getElementById('closeBanCustomerModal');
  const cancelBanCustomerBtn = document.getElementById('cancelBanCustomerBtn');
  const banCustomerForm = document.getElementById('banCustomerForm');
  
  closeBanCustomerModal.onclick = () => {
    banCustomerModal.style.display = 'none';
  };
  
  cancelBanCustomerBtn.onclick = () => {
    banCustomerModal.style.display = 'none';
  };
  
  banCustomerForm.onsubmit = async function(e) {
    e.preventDefault();
    const customerId = banCustomerModal.getAttribute('data-customer-id');
    const reason = document.getElementById('banCustomerReasonInput').value.trim();
    const duration = parseInt(document.getElementById('banCustomerDurationInput').value, 10);
    
    if (!reason) {
      alert('Vui lòng nhập lý do cấm.');
      return;
    }
    
    try {
      const res = await fetch(`https://yours-fashion.vercel.app/api/admin/customers/${customerId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason, 
          duration,
          adminUsername: 'Admin'
        })
      });
      
      if (res.ok) {
        alert('Đã cấm khách hàng thành công');
        banCustomerModal.style.display = 'none';
        loadCustomers();
      } else {
        const error = await res.json();
        alert('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Error banning customer:', error);
      alert('Có lỗi xảy ra khi cấm khách hàng');
    }
  };
});

// Delete customer modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const deleteCustomerModal = document.getElementById('deleteCustomerModal');
  const closeDeleteCustomerModal = document.getElementById('closeDeleteCustomerModal');
  const cancelDeleteCustomerBtn = document.getElementById('cancelDeleteCustomerBtn');
  const deleteCustomerForm = document.getElementById('deleteCustomerForm');
  
  closeDeleteCustomerModal.onclick = () => {
    deleteCustomerModal.style.display = 'none';
  };
  
  cancelDeleteCustomerBtn.onclick = () => {
    deleteCustomerModal.style.display = 'none';
  };
  
  deleteCustomerForm.onsubmit = async function(e) {
    e.preventDefault();
    const customerId = deleteCustomerModal.getAttribute('data-customer-id');
    const reason = document.getElementById('deleteCustomerReasonInput').value.trim();
    
    if (!reason) {
      alert('Vui lòng nhập lý do xóa.');
      return;
    }
    
    if (!confirm('Bạn có chắc chắn muốn xóa vĩnh viễn khách hàng này? Hành động này không thể hoàn tác!')) {
      return;
    }
    
    try {
      const res = await fetch(`https://yours-fashion.vercel.app/api/admin/customers/${customerId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason,
          adminUsername: 'Admin'
        })
      });
      
      if (res.ok) {
        alert('Đã xóa khách hàng thành công');
        deleteCustomerModal.style.display = 'none';
        loadCustomers();
      } else {
        const error = await res.json();
        alert('Lỗi: ' + error.message);
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Có lỗi xảy ra khi xóa khách hàng');
    }
  };
});

// Customer details modal event listeners
window.addEventListener('DOMContentLoaded', () => {
  const customerDetailsModal = document.getElementById('customerDetailsModal');
  const closeCustomerDetailsModal = document.getElementById('closeCustomerDetailsModal');
  const closeCustomerDetailsBtn = document.getElementById('closeCustomerDetailsBtn');
  
  closeCustomerDetailsModal.onclick = () => {
    customerDetailsModal.style.display = 'none';
  };
  
  closeCustomerDetailsBtn.onclick = () => {
    customerDetailsModal.style.display = 'none';
  };
  
  // Close modal when clicking outside
  customerDetailsModal.onclick = (e) => {
    if (e.target === customerDetailsModal) {
      customerDetailsModal.style.display = 'none';
    }
  };
});

// ===== END CUSTOMER MANAGEMENT MODAL EVENT LISTENERS =====

// ===== ADMIN NOTIFICATIONS LOGIC =====

async function loadNotifications() {
  const res = await fetch('https://yours-fashion.vercel.app/api/admin/notifications?limit=100');
  const notifications = await res.json();
  renderNotifications(notifications);
}

function renderNotifications(notifications) {
  const container = document.getElementById('notificationsContainer');
  container.innerHTML = '';
  
  if (notifications.length === 0) {
    container.innerHTML = '<div class="empty-notifications">Không có thông báo nào</div>';
    document.getElementById('notificationsCountBadge').textContent = '0';
    return;
  }
  
  notifications.forEach((notification, index) => {
    const notificationElement = document.createElement('div');
    notificationElement.className = `notification-item ${notification.isRead ? '' : 'unread'}`;
    notificationElement.style.animationDelay = `${index * 0.1}s`;
    notificationElement.style.opacity = '0';
    notificationElement.style.transform = 'translateX(30px)';
    notificationElement.innerHTML = `
      <div class="notification-icon ${notification.type}">
        ${getNotificationIcon(notification.type)}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${timeSince(new Date(notification.createdAt))}</div>
        ${notification.actions ? `
          <div class="notification-actions">
            ${notification.actions.map(action => 
              `<button class="${action.class || ''}" onclick="${action.onclick}">${action.text}</button>`
            ).join('')}
          </div>
        ` : ''}
      </div>
    `;
    
    container.appendChild(notificationElement);
    
    // Trigger animation after a small delay
    setTimeout(() => {
      notificationElement.style.transition = 'all 0.4s ease-out';
      notificationElement.style.opacity = '1';
      notificationElement.style.transform = 'translateX(0)';
    }, index * 100);
  });
  
  document.getElementById('notificationsCountBadge').textContent = notifications.filter(n => !n.isRead).length;
}

function getNotificationIcon(type) {
  switch(type) {
    case 'new-design': return '🎨';
    case 'new-customer': return '🧑';
    case 'new-order': return '🛒';
    case 'payment': return '💸';
    default: return '🔔';
  }
}

function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = Math.floor(seconds / 31536000);
  if (interval > 1) return interval + ' năm trước';
  interval = Math.floor(seconds / 2592000);
  if (interval > 1) return interval + ' tháng trước';
  interval = Math.floor(seconds / 86400);
  if (interval > 1) return interval + ' ngày trước';
  interval = Math.floor(seconds / 3600);
  if (interval > 1) return interval + ' giờ trước';
  interval = Math.floor(seconds / 60);
  if (interval > 1) return interval + ' phút trước';
  return 'Vừa xong';
}

window.markNotificationRead = async function(id) {
  await fetch(`https://yours-fashion.vercel.app/api/admin/notifications/${id}/read`, { method: 'POST' });
  loadNotifications();
};

window.deleteNotification = async function(id) {
  if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;
  await fetch(`https://yours-fashion.vercel.app/api/admin/notifications/${id}`, { method: 'DELETE' });
  loadNotifications();
};

document.getElementById('markAllReadBtn').onclick = async function() {
  await fetch('https://yours-fashion.vercel.app/api/admin/notifications/read-all', { method: 'POST' });
  loadNotifications();
};
document.getElementById('clearAllBtn').onclick = async function() {
  if (!confirm('Bạn có chắc chắn muốn xóa tất cả thông báo?')) return;
  await fetch('https://yours-fashion.vercel.app/api/admin/notifications', { method: 'DELETE' });
  loadNotifications();
};

// Sidebar tab switching function
function showSidebarTab(tab) {
  console.log('[DEBUG] showSidebarTab called with:', tab);
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  // Remove active class from all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  // Show the selected tab
  const content = document.getElementById('sidebarContent-' + tab);
  if (content) content.style.display = 'block';
  // Set active class on sidebar link
  const link = document.getElementById('sidebar-link-' + tab);
  if (link) link.classList.add('active');
  // Special: load withdrawals if thanh-toan-designer tab
  if (tab === 'thanh-toan-designer') {
    console.log('[DEBUG] Calling loadWithdrawals() for thanh-toan-designer tab');
    if (typeof loadWithdrawals === 'function') loadWithdrawals();
  }
}

// Auto-refresh notifications every 30s
setInterval(loadNotifications, 30000);

// ===== END ADMIN NOTIFICATIONS LOGIC =====

// ===== ADMIN SETTINGS LOGIC =====

// Settings management
class AdminSettings {
  constructor() {
    this.settings = {
      darkMode: false,
      fontSize: 'medium',
      colorTheme: '#7B3FF2',
      autoRefresh: true,
      refreshInterval: 60,
      compactMode: false
    };
    this.loadSettings();
    this.initSettings();
  }

  loadSettings() {
    const saved = localStorage.getItem('adminDashboardSettings');
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  saveSettings() {
    localStorage.setItem('adminDashboardSettings', JSON.stringify(this.settings));
  }

  initSettings() {
    // Apply current settings
    this.applySettings();
    
    // Set up event listeners
    this.setupEventListeners();
  }

  applySettings() {
    const { darkMode, fontSize, colorTheme, compactMode } = this.settings;
    
    // Apply dark mode
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Apply font size
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${fontSize}`);
    
    // Apply color theme
    this.updateColorTheme(colorTheme);
    
    // Apply compact mode
    if (compactMode) {
      document.body.classList.add('compact-mode');
    } else {
      document.body.classList.remove('compact-mode');
    }
    
    // Update UI elements
    this.updateUIElements();
  }

  updateColorTheme(color) {
    // Update CSS custom properties
    document.documentElement.style.setProperty('--primary-color', color);
    
    // Update toggle switch colors
    const toggles = document.querySelectorAll('.toggle-switch input:checked + .toggle-slider');
    toggles.forEach(toggle => {
      toggle.style.backgroundColor = color;
    });
    
    // Update active button colors
    const activeButtons = document.querySelectorAll('.font-size-btn.active, .action-btn.approve');
    activeButtons.forEach(btn => {
      btn.style.backgroundColor = color;
      btn.style.borderColor = color;
    });
  }

  updateUIElements() {
    // Update toggle switches
    document.getElementById('darkModeToggle').checked = this.settings.darkMode;
    document.getElementById('autoRefreshToggle').checked = this.settings.autoRefresh;
    document.getElementById('compactModeToggle').checked = this.settings.compactMode;
    
    // Update font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.size === this.settings.fontSize) {
        btn.classList.add('active');
      }
    });
    
    // Update color theme buttons
    document.querySelectorAll('.color-theme-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.dataset.color === this.settings.colorTheme) {
        btn.classList.add('active');
      }
    });
    
    // Update refresh interval
    document.getElementById('refreshInterval').value = this.settings.refreshInterval;
  }

  setupEventListeners() {
    // Dark mode toggle
    document.getElementById('darkModeToggle').addEventListener('change', (e) => {
      this.settings.darkMode = e.target.checked;
      this.applySettings();
      this.saveSettings();
    });

    // Font size buttons
    document.querySelectorAll('.font-size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.fontSize = btn.dataset.size;
        this.applySettings();
        this.saveSettings();
      });
    });

    // Color theme buttons
    document.querySelectorAll('.color-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.settings.colorTheme = btn.dataset.color;
        this.applySettings();
        this.saveSettings();
      });
    });

    // Auto refresh toggle
    document.getElementById('autoRefreshToggle').addEventListener('change', (e) => {
      this.settings.autoRefresh = e.target.checked;
      this.updateAutoRefresh();
      this.saveSettings();
    });

    // Refresh interval
    document.getElementById('refreshInterval').addEventListener('change', (e) => {
      this.settings.refreshInterval = parseInt(e.target.value);
      this.updateAutoRefresh();
      this.saveSettings();
    });

    // Compact mode toggle
    document.getElementById('compactModeToggle').addEventListener('change', (e) => {
      this.settings.compactMode = e.target.checked;
      this.applySettings();
      this.saveSettings();
    });

    // Reset settings
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
      if (confirm('Bạn có chắc chắn muốn khôi phục tất cả cài đặt về mặc định?')) {
        this.resetSettings();
      }
    });
  }

  updateAutoRefresh() {
    // Clear existing intervals
    if (window.adminRefreshInterval) {
      clearInterval(window.adminRefreshInterval);
    }
    
    // Set up new interval if auto refresh is enabled
    if (this.settings.autoRefresh) {
      window.adminRefreshInterval = setInterval(() => {
        loadStats();
        loadRecentOrders();
        loadNotifications();
      }, this.settings.refreshInterval * 1000);
    }
  }

  resetSettings() {
    this.settings = {
      darkMode: false,
      fontSize: 'medium',
      colorTheme: '#7B3FF2',
      autoRefresh: true,
      refreshInterval: 60,
      compactMode: false
    };
    
    this.applySettings();
    this.saveSettings();
    this.updateAutoRefresh();
    
    // Show success message
    this.showNotification('Cài đặt đã được khôi phục về mặc định!', 'success');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    // Set background color based on type
    switch(type) {
      case 'success':
        notification.style.backgroundColor = '#4CAF50';
        break;
      case 'error':
        notification.style.backgroundColor = '#e74c3c';
        break;
      default:
        notification.style.backgroundColor = '#7B3FF2';
    }
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Initialize settings when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.adminSettings = new AdminSettings();
});

// Add CSS animations for notifications
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ===== END ADMIN SETTINGS LOGIC =====

// Fetch and render all orders
async function loadAllOrders() {
  try {
    const res = await fetch('https://yours-fashion.vercel.app/api/admin/orders', {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return;
    }
    
    const orders = await res.json();
    
    // Store orders globally for modal access
    window.currentOrders = orders;
    
    const tbody = document.querySelector('#allOrdersTable tbody');
    tbody.innerHTML = '';
    
    orders.forEach((order, index) => {
      // Modern order type badge with icon - handle mixed orders
      let orderTypeDisplay = '';
      const hasCustomDesign = order.customDesign && order.customDesign.designImage;
      const hasStoreProducts = order.items && order.items.length > 0;
      
      // Debug logging
      console.log('Order:', order.orderCode, 'Custom Design:', order.customDesign, 'Items:', order.items);
      
      // Check order type from backend or determine from content
      if (order.orderType === 'mixed' || (hasCustomDesign && hasStoreProducts)) {
        orderTypeDisplay = `<span class="order-type-badge mixed"><span class="badge-icon">🎨🛒</span>Hỗn hợp</span>`;
      } else if (order.orderType === 'custom_design' || hasCustomDesign) {
        orderTypeDisplay = `<span class="order-type-badge custom"><span class="badge-icon">🎨</span>Thiết kế tùy chỉnh</span>`;
      } else if (order.orderType === 'product_purchase' || hasStoreProducts) {
        orderTypeDisplay = `<span class="order-type-badge product"><span class="badge-icon">🛒</span>Mua sản phẩm</span>`;
      } else {
        orderTypeDisplay = `<span class="order-type-badge unknown"><span class="badge-icon">❓</span>Không xác định</span>`;
      }
      
      // Get product images - show both custom design and store products if both exist
      let productImgHtml = '';
      let allProducts = [];
      
      // Add custom design if exists
      if (order.customDesign && order.customDesign.designImage) {
        allProducts.push({
          type: 'custom',
          image: order.customDesign.designImage,
          name: 'Thiết kế tùy chỉnh',
          designType: order.customDesign.designType,
          color: order.customDesign.color,
          size: order.customDesign.size,
          quantity: order.customDesign.quantity || 1
        });
      }
      
      // Add store products if exist
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          allProducts.push({
            type: 'store',
            image: item.image,
            name: item.name,
            size: item.size,
            quantity: item.quantity || 1
          });
        });
      }
      
      if (allProducts.length === 0) {
        productImgHtml = '<span style="color:#bbb;">(Không có ảnh)</span>';
      } else if (allProducts.length === 1) {
        // Single product - show one image
        const product = allProducts[0];
        productImgHtml = product.image ? 
          `<img src="${product.image}" alt="${product.name}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">` :
          '<span style="color:#bbb;">(Không có ảnh)</span>';
      } else {
        // Multiple products - show multiple images in a flex container
        const images = allProducts.map(product => 
          product.image ? 
            `<img src="${product.image}" alt="${product.name}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);">` :
            `<div style="width:40px;height:40px;background:#f0f0f0;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#999;">N/A</div>`
        ).join('');
        productImgHtml = `
          <div style="display:flex;gap:4px;flex-wrap:wrap;max-width:120px;">
            ${images}
            ${allProducts.length > 4 ? `<div style="width:40px;height:40px;background:#7B3FF2;color:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">+${allProducts.length - 4}</div>` : ''}
          </div>
        `;
      }
      
      // Get product information - show both custom design and store products
      let productInfo = '';
      
      if (allProducts.length === 0) {
        productInfo = '<span style="color: #999;">Không có thông tin</span>';
      } else if (allProducts.length === 1) {
        // Single product - show detailed info
        const product = allProducts[0];
        if (product.type === 'custom') {
          productInfo = `
            <div style="font-weight: 500; color: #7B3FF2;">🎨 ${product.name}</div>
            <div style="font-size: 12px; color: #666;">
              Loại: ${product.designType.toUpperCase()}<br>
              Màu: ${product.color || 'N/A'}<br>
              Size: ${product.size || 'N/A'}<br>
              Số lượng: ${product.quantity}
            </div>
          `;
        } else {
          productInfo = `
            <div style="font-weight: 500;">${product.name}</div>
            <div style="font-size: 12px; color: #666;">
              Size: ${product.size || 'N/A'}<br>
              Số lượng: ${product.quantity}
            </div>
          `;
        }
      } else {
        // Multiple products - show list of products with labels
        const productList = allProducts.map(product => {
          if (product.type === 'custom') {
            return `
              <div style="font-weight: 500; font-size: 13px; color: #7B3FF2;">🎨 ${product.name}</div>
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
                Loại: ${product.designType.toUpperCase()} | Màu: ${product.color || 'N/A'} | Size: ${product.size || 'N/A'} | SL: ${product.quantity}
              </div>
            `;
          } else {
            return `
              <div style="font-weight: 500; font-size: 13px;">${product.name}</div>
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;">
                Size: ${product.size || 'N/A'} | SL: ${product.quantity}
              </div>
            `;
          }
        }).join('');
        
        productInfo = `
          <div style="max-height: 80px; overflow-y: auto;">
            ${productList}
            ${allProducts.length > 3 ? `<div style="font-size: 11px; color: #7B3FF2; font-weight: 500;">+${allProducts.length - 3} sản phẩm khác</div>` : ''}
          </div>
        `;
      }
      
      // Get customer information
      const customerName = order.customer?.name || order.customer?.username || order.username || 'Không rõ';
      const customerInfo = `
        <div style="font-weight: 500;">${customerName}</div>
        <div style="font-size: 12px; color: #666;">
          ${order.customer?.email || ''}<br>
          ${order.customer?.phone || ''}
        </div>
      `;
      
      // Get designer information
      const designerInfo = order.designer ? 
        `<div style="font-weight: 500;">${order.designer.name || order.designer.username}</div>
         <div style="font-size: 12px; color: #666;">${order.designer.email || ''}</div>` :
        '<span style="color: #999;">-</span>';
      
      // Status options with new custom design statuses
      const statusOptions = [
        { value: 'PENDING', label: 'Chờ thanh toán' },
        { value: 'PAID', label: 'Đã thanh toán' },
        { value: 'DESIGN_IN_PROGRESS', label: 'Đang thiết kế' },
        { value: 'DESIGN_APPROVED', label: 'Thiết kế đã duyệt' },
        { value: 'DESIGN_REJECTED', label: 'Thiết kế bị từ chối' },
        { value: 'COMPLETED', label: 'Đang làm áo' },
        { value: 'DELIVERED', label: 'Đang giao' },
        { value: 'DELIVERED_FINAL', label: 'Đã giao' },
        { value: 'CANCELED', label: 'Đã hủy' }
      ];
      
      let statusSelect = `<select class="status-select" data-id="${order.id}" data-current="${order.status}">`;
      statusOptions.forEach(opt => {
        statusSelect += `<option value="${opt.value}"${order.status === opt.value ? ' selected' : ''}>${opt.label}</option>`;
      });
      statusSelect += '</select>';
      
      // Update button
      let updateBtn = `<button class="action-btn approve update-status-btn" data-id="${order.id}" disabled>Cập Nhật</button>`;
      
      // Action buttons based on order type
      let actionButtons = updateBtn;
      actionButtons += ` <button class="action-btn" onclick="viewOrderProductDetails('${order.id}')">Xem chi tiết</button>`;
      if (hasCustomDesign) {
        actionButtons += `
          <button class="action-btn" onclick="viewCustomDesign('${order.id}')">Xem thiết kế</button>
        `;
      }
      actionButtons = `<div class='order-actions'>${actionButtons}</div>`;
      
      const row = document.createElement('tr');
      row.setAttribute('data-order-id', order.id);
      row.style.animationDelay = `${index * 0.1}s`;
      row.style.opacity = '0';
      row.style.transform = 'translateY(20px)';
      row.innerHTML = `
        <td><strong>${order.orderCode || order.id}</strong></td>
        <td>${orderTypeDisplay}</td>
        <td>${productImgHtml}</td>
        <td>${productInfo}</td>
        <td>${customerInfo}</td>
        <td>${designerInfo}</td>
        <td>${statusSelect}</td>
        <td><strong>${formatVND(order.amount)}</strong></td>
        <td>${new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
        <td>${actionButtons}</td>
      `;
      
      tbody.appendChild(row);
      
      // Trigger animation after a small delay
      setTimeout(() => {
        row.style.transition = 'all 0.4s ease-out';
        row.style.opacity = '1';
        row.style.transform = 'translateY(0)';
      }, index * 100);
    });
    
    // Attach event listeners for status select and update button
    document.querySelectorAll('.status-select').forEach(select => {
      select.addEventListener('change', function() {
        const orderId = this.getAttribute('data-id');
        const current = this.getAttribute('data-current');
        const updateBtn = document.querySelector(`.update-status-btn[data-id='${orderId}']`);
        if (this.value !== current) {
          updateBtn.disabled = false;
        } else {
          updateBtn.disabled = true;
        }
      });
    });
    
    document.querySelectorAll('.update-status-btn').forEach(btn => {
      btn.addEventListener('click', async function() {
        const orderId = this.getAttribute('data-id');
        const select = document.querySelector(`.status-select[data-id='${orderId}']`);
        const newStatus = select.value;
        await updateOrderStatus(orderId, newStatus);
        loadAllOrders();
      });
    });
    
    // Add filter functionality
    setupOrderFilters();
    
    // Setup payout search functionality
    setupPayoutSearch();
    
  } catch (error) {
    console.error('Error loading orders:', error);
  }
}

// Setup order filters
function setupOrderFilters() {
  const typeFilter = document.getElementById('orderTypeFilter');
  const statusFilter = document.getElementById('orderStatusFilter');
  
  if (typeFilter) {
    typeFilter.addEventListener('change', filterOrders);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', filterOrders);
  }
}

// Filter orders based on selected criteria
function filterOrders() {
  const typeFilter = document.getElementById('orderTypeFilter')?.value || 'all';
  const statusFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  
  const rows = document.querySelectorAll('#allOrdersTable tbody tr');
  
  rows.forEach(row => {
    const orderType = row.querySelector('td:nth-child(2) span')?.textContent || '';
    const status = row.querySelector('.status-select')?.value || '';
    
    let showRow = true;
    
    // Filter by type
    if (typeFilter !== 'all') {
      const isCustomDesign = orderType.includes('Thiết kế tùy chỉnh');
      const isMixed = orderType.includes('Hỗn hợp');
      if (typeFilter === 'custom_design' && !isCustomDesign && !isMixed) showRow = false;
      if (typeFilter === 'product_purchase' && isCustomDesign && !isMixed) showRow = false;
      if (typeFilter === 'mixed' && !isMixed) showRow = false;
    }
    
    // Filter by status
    if (statusFilter !== 'all' && status !== statusFilter) {
      showRow = false;
    }
    
    row.style.display = showRow ? '' : 'none';
  });
}

// View custom design details
function viewCustomDesign(orderId) {
  // Find the order data from the current orders
  const orderRow = document.querySelector(`tr[data-order-id="${orderId}"]`);
  if (!orderRow) {
    alert('Không tìm thấy thông tin đơn hàng');
    return;
  }
  
  // Get order data from the row
  const orderData = window.currentOrders?.find(order => order.id === orderId);
  if (!orderData || !orderData.customDesign) {
    alert('Không tìm thấy thông tin thiết kế');
    return;
  }
  
  const design = orderData.customDesign;
  const customer = orderData.customer;
  
  // Create modal content
  const modalContent = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <h3 style="color: #7B3FF2; margin-bottom: 15px;">Thông tin khách hàng</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <p><strong>Tên:</strong> ${customer.name || customer.username || 'N/A'}</p>
          <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
          <p><strong>Số điện thoại:</strong> ${customer.phone || 'N/A'}</p>
          <p><strong>Địa chỉ:</strong> ${customer.address || 'N/A'}</p>
        </div>
        
        <h3 style="color: #7B3FF2; margin: 20px 0 15px 0;">Thông tin đơn hàng</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <p><strong>Mã đơn hàng:</strong> ${orderData.orderCode}</p>
          <p><strong>Giá trị:</strong> ${formatVND(orderData.amount)}</p>
          <p><strong>Ngày đặt:</strong> ${new Date(orderData.createdAt).toLocaleDateString('vi-VN')}</p>
          <p><strong>Trạng thái:</strong> <span style="color: #7B3FF2; font-weight: 500;">${getStatusText(orderData.status)}</span></p>
        </div>
      </div>
      
      <div>
        <h3 style="color: #7B3FF2; margin-bottom: 15px;">Chi tiết thiết kế</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
          <p><strong>Loại áo:</strong> ${design.designType.toUpperCase()}</p>
          <p><strong>Màu sắc:</strong> ${design.color || 'N/A'}</p>
          <p><strong>Size:</strong> ${design.size || 'N/A'}</p>
          <p><strong>Số lượng:</strong> ${design.quantity || 1}</p>
          <p><strong>Chất liệu:</strong> ${design.material || 'Vải Cotton'}</p>
          ${design.specialInstructions ? `<p><strong>Yêu cầu đặc biệt:</strong> ${design.specialInstructions}</p>` : ''}
        </div>
        
        ${design.designImage ? `
          <h3 style="color: #7B3FF2; margin: 20px 0 15px 0;">Hình ảnh thiết kế</h3>
          <div style="text-align: center;">
            <img src="${design.designImage}" alt="Custom Design" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 2px solid #eee;">
          </div>
        ` : ''}
        
        ${design.designElements && design.designElements.length > 0 ? `
          <h3 style="color: #7B3FF2; margin: 20px 0 15px 0;">Các yếu tố thiết kế</h3>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
            ${design.designElements.map((element, index) => `
              <div style="margin-bottom: 10px; padding: 8px; background: white; border-radius: 4px;">
                <strong>Yếu tố ${index + 1}:</strong> ${element.type}<br>
                <small>Nội dung: ${element.content}</small><br>
                <small>Vị trí: (${element.x}, ${element.y}) - Kích thước: ${element.width}x${element.height}</small>
                ${element.color ? `<br><small>Màu: ${element.color}</small>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    </div>
    
    <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
      <h3 style="color: #7B3FF2; margin-bottom: 15px;">Cập nhật trạng thái</h3>
      <div style="display: flex; gap: 10px; align-items: center;">
        <select id="designStatusSelect" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd;">
          <option value="PENDING" ${orderData.status === 'PENDING' ? 'selected' : ''}>Chờ thanh toán</option>
          <option value="PAID" ${orderData.status === 'PAID' ? 'selected' : ''}>Đã thanh toán</option>
          <option value="DESIGN_IN_PROGRESS" ${orderData.status === 'DESIGN_IN_PROGRESS' ? 'selected' : ''}>Đang thiết kế</option>
          <option value="DESIGN_APPROVED" ${orderData.status === 'DESIGN_APPROVED' ? 'selected' : ''}>Thiết kế đã duyệt</option>
          <option value="DESIGN_REJECTED" ${orderData.status === 'DESIGN_REJECTED' ? 'selected' : ''}>Thiết kế bị từ chối</option>
          <option value="COMPLETED" ${orderData.status === 'COMPLETED' ? 'selected' : ''}>Đang làm áo</option>
          <option value="DELIVERED" ${orderData.status === 'DELIVERED' ? 'selected' : ''}>Đang giao</option>
          <option value="DELIVERED_FINAL" ${orderData.status === 'DELIVERED_FINAL' ? 'selected' : ''}>Đã giao</option>
          <option value="CANCELED" ${orderData.status === 'CANCELED' ? 'selected' : ''}>Đã hủy</option>
        </select>
        <textarea id="designNotes" placeholder="Ghi chú (tùy chọn)" style="padding: 8px 12px; border-radius: 6px; border: 1px solid #ddd; flex: 1; min-height: 60px; resize: vertical;"></textarea>
        <button onclick="updateCustomDesignStatus('${orderId}')" style="background: #7B3FF2; color: white; padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer;">Cập nhật</button>
      </div>
    </div>
  `;
  
  document.getElementById('customDesignModalBody').innerHTML = modalContent;
  document.getElementById('customDesignModal').style.display = 'block';
}

// Close custom design modal
function closeCustomDesignModal() {
  document.getElementById('customDesignModal').style.display = 'none';
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
  const modal = document.getElementById('customDesignModal');
  if (event.target === modal) {
    closeCustomDesignModal();
  }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeCustomDesignModal();
  }
});

// Update custom design status
async function updateCustomDesignStatus(orderId) {
  try {
    const status = document.getElementById('designStatusSelect').value;
    const notes = document.getElementById('designNotes').value;
    
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/orders/${orderId}/design-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ status, notes })
    });
    
    if (res.ok) {
      alert('Cập nhật trạng thái thành công!');
      closeCustomDesignModal();
      loadAllOrders(); // Refresh the orders list
    } else {
      const error = await res.json();
      alert('Lỗi: ' + (error.message || 'Không thể cập nhật trạng thái'));
    }
  } catch (error) {
    console.error('Error updating design status:', error);
    alert('Lỗi kết nối server');
  }
}

// Helper function to get status text
function getStatusText(status) {
  const statusMap = {
    'PENDING': 'Chờ thanh toán',
    'PAID': 'Đã thanh toán',
    'DESIGN_IN_PROGRESS': 'Đang thiết kế',
    'DESIGN_APPROVED': 'Thiết kế đã duyệt',
    'DESIGN_REJECTED': 'Thiết kế bị từ chối',
    'COMPLETED': 'Đang làm áo',
    'DELIVERED': 'Đang giao',
    'DELIVERED_FINAL': 'Đã giao',
    'CANCELED': 'Đã hủy'
  };
  return statusMap[status] || status;
}

async function updateOrderStatus(orderId, status) {
  let endpoint = '';
  if (status === 'PAID') endpoint = `/api/admin/orders/${orderId}/paid`;
  else if (status === 'COMPLETED') endpoint = `/api/admin/orders/${orderId}/complete`;
  else if (status === 'DELIVERED') endpoint = `/api/admin/orders/${orderId}/deliver`;
  else if (status === 'DELIVERED_FINAL') endpoint = `/api/admin/orders/${orderId}/finish`;
  else if (status === 'CANCELED') endpoint = `/api/admin/orders/${orderId}/reject`;
  if (endpoint) {
    await fetch(`https://yours-fashion.vercel.app${endpoint}`, { method: 'POST' });
  }
}

// Fetch and render designs for approval
async function loadDesigns() {
  try {
    const res = await fetch('https://yours-fashion.vercel.app/api/admin/designs', {
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return;
    }
    
    let designs = await res.json();
    // Sort by createdAt, newest first
    designs = designs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // Store all designs for search
    window._allDesigns = designs;
    renderDesignsTable(designs);
    document.getElementById('pendingDesignsBadge').textContent = designs.filter(d => d.status === 'pending').length;
  } catch (error) {
    console.error('Error loading designs:', error);
  }
}

// ===== END ADMIN SETTINGS LOGIC ===== 

// Add the viewOrderProductDetails function
window.viewOrderProductDetails = function(orderId) {
  const order = window.currentOrders?.find(o => o.id === orderId);
  if (!order) {
    alert('Không tìm thấy thông tin đơn hàng');
    return;
  }

  let productDetails = '';
  if (order.orderType === 'custom_design' && order.customDesign) {
    productDetails = `
      <div style="margin-bottom: 16px;">
        <h4>🎨 Thiết kế tùy chỉnh</h4>
        <div style="background:#f8f9fa;padding:16px;border-radius:8px;border-left:4px solid #7B3FF2;">
          <p><strong>Loại áo:</strong> ${order.customDesign.designType.toUpperCase()}</p>
          <p><strong>Màu sắc:</strong> ${order.customDesign.color || 'N/A'}</p>
          <p><strong>Kích thước:</strong> ${order.customDesign.size || 'N/A'}</p>
          <p><strong>Số lượng:</strong> ${order.customDesign.quantity || 1}</p>
          ${order.customDesign.designImage ? `<img src="${order.customDesign.designImage}" alt="Design" style="max-width:200px;border-radius:8px;margin-top:8px;box-shadow:0 4px 12px rgba(0,0,0,0.1);cursor:pointer;" onclick="showImageModal('${order.customDesign.designImage}', 'Thiết kế tùy chỉnh')">` : ''}
        </div>
      </div>
    `;
  } else if (order.items && order.items.length > 0) {
    const productCount = order.items.length;
    const isMultipleProducts = productCount > 1;
    
    productDetails = `
      <div style="margin-bottom: 16px;">
        <h4>${isMultipleProducts ? '🛍️ Sản phẩm' : '📦 Sản phẩm'} (${productCount})</h4>
        ${isMultipleProducts ? `
          <div style="background:#e8f4fd;padding:12px;border-radius:8px;margin-bottom:12px;border-left:4px solid #7B3FF2;">
            <p style="margin:0;color:#7B3FF2;font-weight:600;">📋 Đơn hàng gồm ${productCount} sản phẩm khác nhau</p>
          </div>
        ` : ''}
        <div style="max-height: ${isMultipleProducts ? '400px' : '300px'}; overflow-y: auto;">
          ${order.items.map((item, index) => `
            <div style="border:1px solid #eee;padding:16px;margin-bottom:12px;border-radius:8px;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <div style="display:flex;gap:16px;align-items:center;">
                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:80px;height:80px;object-fit:cover;border-radius:8px;border:2px solid #f0f0f0;cursor:pointer;transition:transform 0.2s;" onclick="showImageModal('${item.image}', '${item.name}')" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">` : `
                  <div style="width:80px;height:80px;background:#f8f9fa;border-radius:8px;display:flex;align-items:center;justify-content:center;border:2px solid #f0f0f0;">
                    <span style="color:#999;font-size:12px;">N/A</span>
                  </div>
                `}
                <div style="flex:1;">
                  <p style="font-weight:600;margin:0;font-size:16px;color:#23222a;">${item.name}</p>
                  <div style="display:flex;gap:16px;margin:8px 0;">
                    <span style="background:#f0f0f0;padding:4px 8px;border-radius:4px;font-size:12px;color:#666;">
                      Size: ${item.size || 'N/A'}
                    </span>
                    <span style="background:#e8f4fd;padding:4px 8px;border-radius:4px;font-size:12px;color:#7B3FF2;font-weight:500;">
                      SL: ${item.quantity || 1}
                    </span>
                  </div>
                  <p style="color:#7B3FF2;font-weight:700;font-size:16px;margin:0;">
                    ${formatVND(item.price || 0)}
                  </p>
                </div>
                ${isMultipleProducts ? `
                  <div style="background:#7B3FF2;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">
                    ${index + 1}
                  </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ${isMultipleProducts ? `
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;margin-top:12px;text-align:center;">
            <p style="margin:0;color:#666;font-size:14px;">
              💰 <strong>Tổng giá trị sản phẩm:</strong> ${formatVND(order.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0))}
            </p>
          </div>
        ` : ''}
      </div>
    `;
  }

  const modalContent = `
    <div style="background:white;padding:24px;border-radius:12px;max-width:700px;max-height:85vh;overflow-y:auto;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <h3 style="margin:0;color:#7B3FF2;font-size:20px;">📋 Chi tiết đơn hàng</h3>
        <button onclick="closeOrderDetailsModal()" style="background:none;border:none;font-size:24px;cursor:pointer;color:#666;padding:4px;">×</button>
      </div>
      
      <div style="margin-bottom:20px;background:#f8f9fa;padding:16px;border-radius:8px;">
        <h4 style="margin:0 0 12px 0;color:#7B3FF2;">📄 Thông tin đơn hàng</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <p style="margin:0;"><strong>Mã đơn:</strong> ${order.orderCode || order.id}</p>
          <p style="margin:0;"><strong>Loại đơn:</strong> ${order.orderType === 'custom_design' ? '🎨 Thiết kế tùy chỉnh' : '🛒 Mua sản phẩm'}</p>
          <p style="margin:0;"><strong>Trạng thái:</strong> <span style="color:#7B3FF2;font-weight:600;">${getStatusText(order.status)}</span></p>
          <p style="margin:0;"><strong>Tổng tiền:</strong> <span style="color:#e74c3c;font-weight:700;font-size:16px;">${formatVND(order.amount)}</span></p>
        </div>
        <p style="margin:8px 0 0 0;"><strong>Ngày tạo:</strong> ${new Date(order.createdAt).toLocaleString('vi-VN')}</p>
      </div>

      <div style="margin-bottom:20px;background:#f8f9fa;padding:16px;border-radius:8px;">
        <h4 style="margin:0 0 12px 0;color:#7B3FF2;">👤 Thông tin khách hàng</h4>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <p style="margin:0;"><strong>Tên:</strong> ${order.customer?.name || order.customer?.username || order.username || 'N/A'}</p>
          <p style="margin:0;"><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
          <p style="margin:0;"><strong>Số điện thoại:</strong> ${order.customer?.phone || 'N/A'}</p>
        </div>
      </div>

      ${order.designer ? `
        <div style="margin-bottom:20px;background:#f8f9fa;padding:16px;border-radius:8px;">
          <h4 style="margin:0 0 12px 0;color:#7B3FF2;">🎨 Thông tin Designer</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <p style="margin:0;"><strong>Tên:</strong> ${order.designer.name || order.designer.username}</p>
            <p style="margin:0;"><strong>Email:</strong> ${order.designer.email || 'N/A'}</p>
          </div>
        </div>
      ` : ''}

      ${productDetails}

      ${order.notes ? `
        <div style="margin-bottom:16px;background:#fff3cd;padding:16px;border-radius:8px;border-left:4px solid #ffc107;">
          <h4 style="margin:0 0 12px 0;color:#856404;">📝 Ghi chú</h4>
          <p style="margin:0;color:#856404;">${order.notes}</p>
        </div>
      ` : ''}
    </div>
  `;

  // Create modal if it doesn't exist
  let modal = document.getElementById('orderDetailsModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'orderDetailsModal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      backdrop-filter: blur(4px);
    `;
    document.body.appendChild(modal);
  }

  modal.innerHTML = modalContent;
  modal.style.display = 'flex';
}

// Show image modal for product images
function showImageModal(imageSrc, imageTitle) {
  // Create image modal if it doesn't exist
  let imageModal = document.getElementById('productImageModal');
  if (!imageModal) {
    imageModal = document.createElement('div');
    imageModal.id = 'productImageModal';
    imageModal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      backdrop-filter: blur(8px);
    `;
    document.body.appendChild(imageModal);
  }

  const modalContent = `
    <div style="position:relative;max-width:90vw;max-height:90vh;text-align:center;">
      <button onclick="closeImageModal()" style="position:absolute;top:-40px;right:0;background:none;border:none;font-size:32px;cursor:pointer;color:#fff;padding:8px;">×</button>
      <h3 style="color:#fff;margin-bottom:20px;font-size:18px;">${imageTitle}</h3>
      <img src="${imageSrc}" alt="${imageTitle}" style="max-width:100%;max-height:70vh;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);cursor:zoom-in;" onclick="toggleImageZoom(this)">
      <p style="color:#fff;margin-top:16px;font-size:14px;opacity:0.8;">Click để phóng to/thu nhỏ</p>
    </div>
  `;

  imageModal.innerHTML = modalContent;
  imageModal.style.display = 'flex';
}

// Close image modal
function closeImageModal() {
  const imageModal = document.getElementById('productImageModal');
  if (imageModal) {
    imageModal.style.display = 'none';
  }
}

// Toggle image zoom
function toggleImageZoom(imgElement) {
  const currentScale = imgElement.style.transform.includes('scale(2)') ? 1 : 2;
  imgElement.style.transform = `scale(${currentScale})`;
  imgElement.style.transition = 'transform 0.3s ease';
  imgElement.style.cursor = currentScale === 2 ? 'zoom-out' : 'zoom-in';
}

// Close order details modal
function closeOrderDetailsModal() {
  const modal = document.getElementById('orderDetailsModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Load designer payouts
async function loadDesignerPayouts() {
  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/admin/designer-payouts', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to load designer payouts');
    
    const payouts = await response.json();
    renderPayoutTable(payouts);
    
    // Update badge
    const unpaidCount = payouts.filter(p => p.hasUnpaidOrders).length;
    const badge = document.getElementById('unpaidDesignersBadge');
    if (badge) badge.textContent = unpaidCount;
    
  } catch (error) {
    console.error('Error loading designer payouts:', error);
  }
}

function renderPayoutTable(payouts) {
  const tbody = document.querySelector('#payoutTable tbody');
  if (!tbody) {
    console.warn('Payout table body not found in DOM.');
    return;
  }
  tbody.innerHTML = '';
  payouts.forEach((payout, index) => {
    const avatar = payout.avatar || 'resources/user-circle.png';
    const hasUnpaid = payout.totalUnpaid > 0;
    const rowClass = hasUnpaid ? 'has-unpaid' : '';
    const row = document.createElement('tr');
    row.className = rowClass;
    row.style.animationDelay = `${index * 0.1}s`;
    row.style.opacity = '0';
    row.style.transform = 'translateY(20px)';
    row.innerHTML = `
      <td><img src="${avatar}" alt="Avatar" class="payout-avatar"></td>
      <td>
        <div style="font-weight: 600; color: #333;">${payout.name || payout.username}</div>
        <div style="font-size: 12px; color: #666;">@${payout.username}</div>
      </td>
      <td>${payout.email}</td>
      <td>${payout.designCount}</td>
      <td class="payout-amount">${formatVND(payout.totalUnpaid)}</td>
      <td class="payout-yours">${formatVND(payout.yoursShare)}</td>
      <td class="payout-designer">${formatVND(payout.designerShare)}</td>
      <td>
        <span class="payout-status ${payout.payoutStatus}">
          ${payout.payoutStatus === 'unpaid' ? 'Chưa trả' : 'Đã trả'}
        </span>
      </td>
      <td>
        ${hasUnpaid ? 
          `<button class="action-btn" style="background:#ff9800;color:#fff;" onclick="payDesigner('${payout.username}')">
            💰 Trả tiền
          </button>` : 
          `<span style="color:#4CAF50;font-weight:600;">✓ Đã trả</span>`
        }
      </td>
    `;
    tbody.appendChild(row);
    setTimeout(() => {
      row.style.transition = 'all 0.4s ease-out';
      row.style.opacity = '1';
      row.style.transform = 'translateY(0)';
    }, index * 100);
  });
}

// Pay designer function
async function payDesigner(designerUsername) {
  if (!confirm(`Xác nhận trả tiền cho designer ${designerUsername}?\n\nHành động này sẽ đánh dấu tất cả đơn hàng đã thanh toán của designer này là đã được trả tiền.`)) {
    return;
  }
  
  try {
    const res = await fetch(`https://yours-fashion.vercel.app/api/admin/designer-payouts/${designerUsername}/pay`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminInfo');
      window.location.href = 'admin-login.html';
      return;
    }
    
    const result = await res.json();
    
    if (result.updatedCount > 0) {
      alert(`✅ Đã trả tiền thành công cho ${designerUsername}!\n\nSố đơn hàng đã cập nhật: ${result.updatedCount}`);
      // Reload payout data
      loadDesignerPayouts();
    } else {
      alert('⚠️ Không có đơn hàng nào cần trả tiền cho designer này.');
    }
  } catch (error) {
    console.error('Error paying designer:', error);
    alert('❌ Có lỗi xảy ra khi trả tiền cho designer. Vui lòng thử lại.');
  }
}

// Setup payout search functionality
function setupPayoutSearch() {
  const searchBox = document.getElementById('payoutSearchBox');
  if (searchBox) {
    searchBox.addEventListener('input', function() {
      const searchTerm = this.value.toLowerCase();
      const rows = document.querySelectorAll('#payoutTable tbody tr');
      
      rows.forEach(row => {
        const designerName = row.cells[1].textContent.toLowerCase();
        const designerUsername = row.cells[1].querySelector('div:last-child').textContent.toLowerCase();
        const email = row.cells[2].textContent.toLowerCase();
        
        if (designerName.includes(searchTerm) || designerUsername.includes(searchTerm) || email.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    });
  }
}

// Load withdrawal requests
async function loadWithdrawals() {
  console.log('[DEBUG] loadWithdrawals called');
  try {
    const response = await fetch('https://yours-fashion.vercel.app/api/admin/withdrawals', {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to load withdrawals');
    
    const withdrawals = await response.json();
    allWithdrawals = withdrawals;
    renderWithdrawalTable(allWithdrawals);
    
    // Update badge
    const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
    const badge = document.getElementById('pendingWithdrawalsBadge');
    if (badge) badge.textContent = pendingCount;
    
    // Setup filters and refresh button after rendering
    setupWithdrawalFilters();
    
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    alert('Lỗi khi xử lý yêu cầu rút tiền');
  }
}

// Show process withdrawal modal
function showProcessWithdrawalModal(withdrawal) {
  const modal = document.getElementById('processWithdrawalModal');
  const detailsDiv = document.getElementById('withdrawalDetails');
  const form = document.getElementById('processWithdrawalForm');
  
  // Format method display to include bank name if available
  let methodDisplay = withdrawal.method.toUpperCase();
  if (withdrawal.method === 'bank' && withdrawal.bankName) {
    methodDisplay = `NGÂN HÀNG ${withdrawal.bankName.toUpperCase()}`;
  }
  
  // Populate withdrawal details
  detailsDiv.innerHTML = `
    <h4 style="margin:0 0 12px 0;color:#7B3FF2;">Chi tiết yêu cầu rút tiền</h4>
    <div style="display:grid;gap:8px;font-size:14px;">
      <div><strong>Mã giao dịch:</strong> ${withdrawal.transactionId}</div>
      <div><strong>Designer:</strong> ${withdrawal.designerUsername}</div>
      <div><strong>Phương thức:</strong> ${methodDisplay}</div>
      <div><strong>Tài khoản:</strong> ${withdrawal.accountInfo}</div>
      <div><strong>Tên chủ tài khoản:</strong> ${withdrawal.accountName}</div>
      ${withdrawal.bankName ? `<div><strong>Ngân hàng:</strong> ${withdrawal.bankName}</div>` : ''}
      <div><strong>Số tiền:</strong> ${formatVND(withdrawal.amount)}</div>
      <div><strong>Ngày yêu cầu:</strong> ${new Date(withdrawal.createdAt).toLocaleString('vi-VN')}</div>
    </div>
  `;
  
  // Set form data
  form.dataset.transactionId = withdrawal.transactionId;
  
  // Show modal
  modal.style.display = 'flex';
  
  // Setup modal event listeners
  setupProcessWithdrawalModal();
}

// Setup process withdrawal modal
function setupProcessWithdrawalModal() {
  const modal = document.getElementById('processWithdrawalModal');
  const closeBtn = document.getElementById('closeProcessWithdrawalModal');
  const cancelBtn = document.getElementById('cancelProcessBtn');
  const form = document.getElementById('processWithdrawalForm');
  
  // Close modal
  const closeModal = () => {
    modal.style.display = 'none';
    form.reset();
  };
  
  closeBtn.onclick = closeModal;
  cancelBtn.onclick = closeModal;
  
  // Close on outside click
  modal.onclick = (e) => {
    if (e.target === modal) closeModal();
  };
  
  // Handle form submission
  form.onsubmit = async (e) => {
    e.preventDefault();
    const transactionId = form.dataset.transactionId;
    const status = document.getElementById('processStatus').value;
    const notes = document.getElementById('processNotes').value;
    if (!status) {
      alert('Vui lòng chọn trạng thái xử lý');
      return;
    }
    try {
      const response = await fetch(`https://yours-fashion.vercel.app/api/admin/withdrawals/${transactionId}/process`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });
      if (!response.ok) throw new Error('Failed to process withdrawal');
      const result = await response.json();
      
      // Show success message with email notification info
      const statusText = status === 'completed' ? 'hoàn thành' : status === 'failed' ? 'từ chối' : 'cập nhật';
      alert(`Xử lý yêu cầu rút tiền thành công!\n\nTrạng thái: ${statusText}\nEmail thông báo đã được gửi đến designer.`);
      
      closeModal();
      loadWithdrawals();
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      alert('Lỗi khi xử lý yêu cầu rút tiền');
    }
  };
}

// Setup withdrawal filters
function setupWithdrawalFilters() {
  const statusFilter = document.getElementById('withdrawalStatusFilter');
  const searchBox = document.getElementById('withdrawalSearchBox');
  const refreshBtn = document.getElementById('refreshWithdrawalsBtn');
  
  if (statusFilter) {
    statusFilter.onchange = () => {
      renderWithdrawalTable(allWithdrawals);
    };
  }
  
  if (searchBox) {
    searchBox.oninput = () => {
      // Implement search functionality
      const searchTerm = searchBox.value.toLowerCase();
      const rows = document.querySelectorAll('#withdrawalTable tbody tr');
      
      rows.forEach(row => {
        const designerName = row.cells[1]?.textContent.toLowerCase() || '';
        const transactionId = row.cells[0]?.textContent.toLowerCase() || '';
        
        if (designerName.includes(searchTerm) || transactionId.includes(searchTerm)) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    };
  }
  
  if (refreshBtn) {
    refreshBtn.onclick = async () => {
      // Add loading state
      const originalText = refreshBtn.innerHTML;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang tải...';
      refreshBtn.disabled = true;
      
      try {
        await loadWithdrawals();
      } catch (error) {
        console.error('Error refreshing withdrawals:', error);
      } finally {
        // Restore original state
        refreshBtn.innerHTML = originalText;
        refreshBtn.disabled = false;
      }
    };
  }
}

// Update showSidebarTab to animate main-content on every tab switch
function showSidebarTab(tab) {
  console.log('[DEBUG] showSidebarTab called with:', tab);
  // Hide all tab contents
  document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
  // Remove active class from all sidebar links
  document.querySelectorAll('.sidebar-link').forEach(el => el.classList.remove('active'));
  // Show the selected tab
  const content = document.getElementById('sidebarContent-' + tab);
  if (content) content.style.display = 'block';
  // Set active class on sidebar link
  const link = document.getElementById('sidebar-link-' + tab);
  if (link) link.classList.add('active');
  // Special: load withdrawals if thanh-toan-designer tab
  if (tab === 'thanh-toan-designer') {
    console.log('[DEBUG] Calling loadWithdrawals() for thanh-toan-designer tab');
    if (typeof loadWithdrawals === 'function') loadWithdrawals();
  }
}

// Helper to convert file to base64
function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

// Render withdrawal table
function renderWithdrawalTable(withdrawals) {
  const statusFilter = document.getElementById('withdrawalStatusFilter')?.value || 'all';
  const tbody = document.querySelector('#withdrawalTable tbody');
  if (!tbody) return;
  if (!withdrawals || withdrawals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">Chưa có yêu cầu rút tiền nào</td></tr>';
    return;
  }
  // Filter withdrawals by status
  const filteredWithdrawals = statusFilter === 'all' ? withdrawals : withdrawals.filter(w => w.status === statusFilter);
  if (filteredWithdrawals.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:40px;color:#666;">Không có yêu cầu rút tiền nào cho trạng thái này</td></tr>';
    return;
  }
  tbody.innerHTML = filteredWithdrawals.map(withdrawal => {
    const statusClass = `withdrawal-status ${withdrawal.status}`;
    const rowClass = withdrawal.status;
    const methodIcon = getMethodIcon(withdrawal.method);
    const methodClass = `withdrawal-method ${withdrawal.method}`;
    
    // Format method display to include bank name if available
    let methodDisplay = withdrawal.method ? withdrawal.method.toUpperCase() : '';
    if (withdrawal.method === 'bank' && withdrawal.bankName) {
      methodDisplay = `NGÂN HÀNG ${withdrawal.bankName.toUpperCase()}`;
    }
    
    let notesHtml = withdrawal.notes || '-';
    if (withdrawal.paymentImage) {
      notesHtml += `<br><a href="${withdrawal.paymentImage}" target="_blank"><img src="${withdrawal.paymentImage}" alt="Payment" style="max-width:60px;max-height:60px;border-radius:6px;margin-top:4px;"></a>`;
    }
    return `
      <tr class="${rowClass}">
        <td><strong>${withdrawal.transactionId}</strong></td>
        <td>${withdrawal.designerUsername}</td>
        <td>
          <div class="${methodClass}">
            ${methodIcon} ${methodDisplay}
          </div>
        </td>
        <td>
          <div>${withdrawal.accountInfo}</div>
          <small style="color:#666;">${withdrawal.accountName}</small>
          ${withdrawal.bankName ? `<br><small style="color:#7B3FF2;font-weight:500;">${withdrawal.bankName}</small>` : ''}
        </td>
        <td class="withdrawal-amount">${formatVND(withdrawal.amount)}</td>
        <td>${withdrawal.createdAt ? new Date(withdrawal.createdAt).toLocaleDateString('vi-VN') : ''}</td>
        <td><span class="${statusClass} designer-payout-status-pill">${getWithdrawalStatusText(withdrawal.status)}</span></td>
        <td>${notesHtml}</td>
        <td>
          ${withdrawal.status === 'pending' ? `
            <button class="action-btn approve" onclick="processWithdrawal('${withdrawal.transactionId}')">
              <i class="fas fa-check"></i> Xử lý
            </button>
          ` : `
            <span style="color:#666;font-size:12px;">
              ${withdrawal.processedAt ? `<br>${new Date(withdrawal.processedAt).toLocaleDateString('vi-VN')}` : ''}
            </span>
          `}
        </td>
      </tr>
    `;
  }).join('');
}

// Get method icon
function getMethodIcon(method) {
  switch (method) {
    case 'momo': return '<i class="fas fa-mobile-alt"></i>';
    case 'zalopay': return '<i class="fas fa-qrcode"></i>';
    case 'bank': return '<i class="fas fa-university"></i>';
    default: return '<i class="fas fa-money-bill"></i>';
  }
}

// Get withdrawal status text
function getWithdrawalStatusText(status) {
  switch (status) {
    case 'pending': return 'Chờ xử lý';
    case 'completed': return 'Hoàn thành';
    case 'failed': return 'Thất bại';
    case 'cancelled': return 'Đã hủy';
    default: return status;
  }
}

// Process withdrawal
async function processWithdrawal(transactionId) {
  try {
    // Get withdrawal details first
    const response = await fetch(`https://yours-fashion.vercel.app/api/admin/withdrawals?transactionId=${transactionId}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) throw new Error('Failed to get withdrawal details');
    
    const withdrawals = await response.json();
    const withdrawal = withdrawals.find(w => w.transactionId === transactionId);
    
    if (!withdrawal) {
      alert('Không tìm thấy yêu cầu rút tiền');
      return;
    }
    
    // Show modal with withdrawal details
    showProcessWithdrawalModal(withdrawal);
    
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    alert('Lỗi khi xử lý yêu cầu rút tiền');
  }
}

// At the top of the file or before loadWithdrawals
let allWithdrawals = [];

// In loadWithdrawals, after fetching withdrawals:
allWithdrawals = withdrawals;
renderWithdrawalTable(allWithdrawals);

// In setupWithdrawalFilters, change statusFilter.onchange to:
statusFilter.onchange = () => {
  renderWithdrawalTable(allWithdrawals);
};