document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('designerProductGrid');
  const searchInput = document.getElementById('designerSearchInput');
  const token = localStorage.getItem('token');
  const allProductsBtn = document.getElementById('allProductsBtn');
  const historyBtn = document.getElementById('historyBtn');
  const draftsBtn = document.getElementById('draftsBtn');
  const statusBtn = document.getElementById('statusBtn');
  const statsBtn = document.getElementById('statsBtn');

  if (!token) {
    grid.innerHTML = '<p style="text-align:center; color:#8A4AF3; font-size:18px;">Vui lòng đăng nhập để xem sản phẩm của bạn.</p>';
    return;
  }

  let allDesigns = [];
  let currentTab = 'all';
  let designerStats = null;

  // Render product cards (grid view)
  function renderDesigns(designs) {
    if (!designs.length) {
      grid.innerHTML = '<p style="text-align:center; color:#8A4AF3; font-size:18px;">Bạn chưa có thiết kế nào được đăng tải.</p>';
      return;
    }
    grid.innerHTML = designs.map(design => {
      let imageSrc = '';
      if (design.designImage && design.designImage.startsWith('data:image/')) {
        imageSrc = design.designImage;
      } else if (design.productType && design.productType.toLowerCase().includes('hoodie')) {
        imageSrc = 'resources/hoodie-demo.png';
      } else {
        imageSrc = 'resources/tshirt-model.png';
      }
      // Show "New" label if uploaded in last 24h
      const isNew = (() => {
        const uploadDate = new Date(design.createdAt || design.uploadDate || 0);
        const now = new Date();
        const timeDifference = now - uploadDate;
        const hoursDifference = timeDifference / (1000 * 60 * 60);
        return hoursDifference <= 24;
      })();
      // If in drafts tab, show 'Continue Designing' and 'Delete' buttons
      const isDraft = design.status === 'draft';
      let statusHtml = '';
      let buttonHtml = '';
      if (!isDraft) {
        if (design.status === 'rejected') {
          statusHtml = `<p style='color:#e74c3c;font-weight:600;'>Đã từ chối</p><p style='color:#e74c3c;font-size:14px;margin-top:-10px;'>Lý do: ${design.rejectionReason || 'Không có lý do'}</p>`;
          buttonHtml = '';
        } else if (design.status === 'pending') {
          statusHtml = `<p style='color:#FFA500;font-weight:600;'>Chờ duyệt</p>`;
          buttonHtml = '';
        } else if (design.status === 'approved') {
          statusHtml = `<p style='color:#4CAF50;font-weight:600;'>Đã duyệt</p>`;
          if (design.modifiedFields && design.modifiedFields.length) {
            statusHtml += `<p style='color:#7B3FF2;font-size:14px;margin-top:-10px;'>Đã chỉnh sửa: ${design.modifiedFields.join(', ')}</p>`;
          }
          buttonHtml = `<button class=\"btn btn-secondary\" onclick=\"window.location.href='products.html?designId=${encodeURIComponent(design.designId)}'\">Xem sản phẩm</button>`;
        }
      } else {
        buttonHtml = `<button class=\"btn btn-primary\" onclick=\"window.location.href='design.html?designId=${encodeURIComponent(design.designId)}'\">Tiếp tục thiết kế</button>
           <button class=\"btn btn-danger\" onclick=\"deleteDraft('${design.designId}')\">Xóa nháp</button>`;
      }
      return `
        <div class=\"product-card\">
          <img src=\"${imageSrc}\" alt=\"${design.productType || 'Product'}\" style=\"height:220px;width:auto;display:block;margin:0 auto 18px auto;object-fit:contain;\">
          ${isNew ? '<span class=\"new-label\">New</span>' : ''}
          <h3>${design.name || 'Tên thiết kế'}</h3>
          <p>by <b>${design.username || ''}</b></p>
          <p class=\"price\">${design.price ? design.price.toLocaleString() : ''} VND</p>
          ${statusHtml}
          ${buttonHtml}
        </div>
      `;
    }).join('');
    // Add .animated class to each product card after rendering
    setTimeout(() => {
      document.querySelectorAll('.product-card').forEach(card => {
        card.classList.add('animated');
      });
    }, 10);
  }

  // Fetch designer's products
  function fetchDesigns() {
    fetch('http://localhost:5000/api/my-designs', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Lỗi xác thực hoặc server');
        return res.json();
      })
      .then(designs => {
        allDesigns = Array.isArray(designs) ? designs : [];
        console.log('Fetched designs for designer:', allDesigns);
        showAllProducts();
      })
      .catch(() => {
        grid.innerHTML = '<p style="text-align:center; color:#e74c3c; font-size:18px;">Không thể tải sản phẩm. Vui lòng thử lại sau.</p>';
      });
  }

  // Show all products
  function showAllProducts() {
    currentTab = 'all';
    setActiveTab();
    hideStatusFilterBar();
    hideStatsContainer();
    showProductGrid();
    renderDesigns(filteredDesigns());
  }

  // Show latest 5 products
  function showHistory() {
    currentTab = 'history';
    setActiveTab();
    hideStatusFilterBar();
    hideStatsContainer();
    showProductGrid();
    const sorted = [...allDesigns].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    renderDesigns(sorted.slice(0, 5));
  }

  // Show drafts
  function showDrafts() {
    currentTab = 'drafts';
    setActiveTab();
    hideStatusFilterBar();
    hideStatsContainer();
    showProductGrid();
    renderDesigns(allDesigns.filter(d => d.status === 'draft'));
  }

  // Show status tab
  function showStatusTab() {
    currentTab = 'status';
    setActiveTab();
    hideStatsContainer();
    showProductGrid();
    // Show filter bar
    document.getElementById('statusFilterBar').style.display = 'flex';
    // Reset filter to 'Đã duyệt' and sort to 'Mới nhất'
    const filterBar = document.getElementById('statusFilterBar');
    if (filterBar) {
      filterBar.querySelectorAll('.status-filter-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === 0);
      });
      const sortDropdown = document.getElementById('sortDropdown');
      if (sortDropdown) sortDropdown.value = 'latest';
    }
    renderStatusFilteredDesigns('approved');
    setupStatusFilterBar();
  }

  // Show stats tab
  function showStats() {
    currentTab = 'stats';
    setActiveTab();
    hideStatusFilterBar();
    hideProductGrid();
    showStatsContainer();
    loadDesignerStats();
    
    // Set up withdrawal form event listener
    setupWithdrawalForm();
  }

  function hideProductGrid() {
    const grid = document.getElementById('designerProductGrid');
    if (grid) grid.style.display = 'none';
  }

  function showProductGrid() {
    const grid = document.getElementById('designerProductGrid');
    if (grid) grid.style.display = 'grid';
  }

  function hideStatsContainer() {
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) statsContainer.style.display = 'none';
  }

  function showStatsContainer() {
    const statsContainer = document.getElementById('statsContainer');
    if (statsContainer) statsContainer.style.display = 'flex';
  }

  function renderStatusFilteredDesigns(status) {
    const sortValue = document.getElementById('sortDropdown') ? document.getElementById('sortDropdown').value : 'latest';
    let filtered = allDesigns.filter(d => d.status === status);
    if (sortValue === 'latest') {
      filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (sortValue === 'oldest') {
      filtered = filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
    renderDesigns(filtered);
  }

  function setupStatusFilterBar() {
    setTimeout(() => {
      const filterBar = document.getElementById('statusFilterBar');
      if (!filterBar) return;
      filterBar.querySelectorAll('.status-filter-btn').forEach(btn => {
        btn.onclick = function() {
          filterBar.querySelectorAll('.status-filter-btn').forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          renderStatusFilteredDesigns(this.getAttribute('data-status'));
        };
      });
      const sortDropdown = document.getElementById('sortDropdown');
      if (sortDropdown) {
        sortDropdown.onchange = function() {
          const activeBtn = filterBar.querySelector('.status-filter-btn.active');
          const status = activeBtn ? activeBtn.getAttribute('data-status') : 'approved';
          renderStatusFilteredDesigns(status);
        };
      }
    }, 0);
  }

  // Hide filter bar in other tabs
  function hideStatusFilterBar() {
    const bar = document.getElementById('statusFilterBar');
    if (bar) bar.style.display = 'none';
  }

  // Set active tab visually
  function setActiveTab() {
    if (allProductsBtn) allProductsBtn.classList.toggle('active', currentTab === 'all');
    if (historyBtn) historyBtn.classList.toggle('active', currentTab === 'history');
    if (draftsBtn) draftsBtn.classList.toggle('active', currentTab === 'drafts');
    if (statusBtn) statusBtn.classList.toggle('active', currentTab === 'status');
    if (statsBtn) statsBtn.classList.toggle('active', currentTab === 'stats');
  }

  // Search filter
  function filteredDesigns() {
    const q = (searchInput && searchInput.value.trim().toLowerCase()) || '';
    return allDesigns.filter(d => (d.name || '').toLowerCase().includes(q));
  }

  if (allProductsBtn) allProductsBtn.addEventListener('click', showAllProducts);
  if (historyBtn) historyBtn.addEventListener('click', showHistory);
  if (draftsBtn) draftsBtn.addEventListener('click', showDrafts);
  if (statusBtn) statusBtn.addEventListener('click', showStatusTab);
  if (statsBtn) statsBtn.addEventListener('click', showStats);

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      if (currentTab === 'all') {
        renderDesigns(filteredDesigns());
      } else {
        const sorted = [...allDesigns].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
        const filtered = sorted.filter(d => (d.name || '').toLowerCase().includes(searchInput.value.trim().toLowerCase()));
        renderDesigns(filtered.slice(0, 5));
      }
    });
  }

  // Add deleteDraft function to window
  window.deleteDraft = async function(designId) {
    if (!confirm('Bạn có chắc muốn xóa nháp này?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/designs/${designId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        // Remove from allDesigns and re-render
        allDesigns = allDesigns.filter(d => d.designId !== designId);
        showDrafts();
      } else {
        alert('Lỗi khi xóa nháp.');
      }
    } catch (e) {
      alert('Lỗi kết nối server khi xóa nháp.');
    }
  }

  // Load designer stats
  async function loadDesignerStats() {
    try {
      const res = await fetch('http://localhost:5000/api/designer/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load stats');
      const stats = await res.json();
      designerStats = stats;
      // Load recent transactions to get pending withdrawals
      const txRes = await fetch('http://localhost:5000/api/designer/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let transactions = [];
      if (txRes.ok) transactions = await txRes.json();
      const pendingTotal = transactions.filter(t => t.status === 'pending').reduce((sum, t) => sum + (t.amount || 0), 0);
      const adjustedAvailable = Math.max(0, (stats.availableAmount || 0) - pendingTotal);
      // Update stats cards
      document.getElementById('totalRevenue').textContent = formatVND(stats.totalRevenue || 0);
      document.getElementById('totalOrders').textContent = stats.totalOrders || 0;
      document.getElementById('totalDesigns').textContent = stats.totalDesigns || 0;
      document.getElementById('totalWithdrawn').textContent = formatVND(stats.totalWithdrawn || 0);
      document.getElementById('availableAmount').textContent = formatVND(adjustedAvailable);
      // Update withdrawal form
      const withdrawalAmount = document.getElementById('withdrawalAmount');
      const withdrawBtn = document.getElementById('withdrawBtn');
      if (withdrawalAmount) {
        withdrawalAmount.max = adjustedAvailable;
        withdrawalAmount.placeholder = `Tối đa: ${formatVND(adjustedAvailable)}`;
      }
      if (withdrawBtn) {
        withdrawBtn.disabled = !adjustedAvailable || adjustedAvailable < 50000;
      }
      // Store for validation
      window._designerAdjustedAvailable = adjustedAvailable;
      // Load recent transactions for display
      renderTransactions(transactions);
    } catch (error) {
      console.error('Error loading designer stats:', error);
      document.getElementById('totalRevenue').textContent = 'Lỗi';
      document.getElementById('totalOrders').textContent = 'Lỗi';
      document.getElementById('totalDesigns').textContent = 'Lỗi';
      document.getElementById('totalWithdrawn').textContent = 'Lỗi';
      document.getElementById('availableAmount').textContent = 'Lỗi';
    }
  }

  // Load recent transactions
  async function loadRecentTransactions() {
    try {
      const res = await fetch('http://localhost:5000/api/designer/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to load transactions');
      
      const transactions = await res.json();
      renderTransactions(transactions);
      
    } catch (error) {
      console.error('Error loading transactions:', error);
      renderTransactions([]);
    }
  }

  // Render transactions
  function renderTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    
    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<div class="empty-transactions">Chưa có lịch sử rút tiền nào</div>';
      return;
    }
    
    container.innerHTML = transactions.map(transaction => {
      // Format the method display to include bank name if available
      let methodDisplay = transaction.method;
      if (transaction.method === 'bank' && transaction.bankName) {
        methodDisplay = `Ngân hàng ${transaction.bankName}`;
      }
      
      // Add cancel button for pending withdrawals
      const cancelButton = transaction.status === 'pending' ? 
        `<button onclick="cancelWithdrawal('${transaction.transactionId}', ${transaction.amount})" style="background:#e74c3c;color:#fff;border:none;padding:6px 12px;border-radius:6px;font-size:12px;cursor:pointer;margin-top:8px;">
          <i class="fas fa-times"></i> Hủy yêu cầu
        </button>` : '';
      
      return `
        <div class="transaction-item" style="flex-direction:column;align-items:stretch;gap:0;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div class="transaction-info">
              <div style="font-weight: 600; color: #333;">${methodDisplay} - ${transaction.accountInfo}</div>
              <div style="font-size: 14px; color: #666;">${new Date(transaction.createdAt).toLocaleDateString('vi-VN')}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="transaction-amount">${formatVND(transaction.amount)}</div>
              <div class="transaction-status status-${transaction.status}">${getStatusText(transaction.status)}</div>
              ${transaction.paymentImage ? `<a href="${transaction.paymentImage}" target="_blank" title="Xem ảnh thanh toán"><img src="${transaction.paymentImage}" alt="Payment" style="max-width:48px;max-height:48px;border-radius:6px;margin-left:8px;box-shadow:0 2px 8px rgba(0,0,0,0.08);"></a>` : ''}
            </div>
          </div>
          ${transaction.notes && transaction.notes.trim() ? `<div style="margin-top:8px;background:#f6f3ff;padding:10px 14px;border-radius:7px;font-size:13px;color:#7B3FF2;display:flex;align-items:flex-start;gap:7px;"><span style='font-size:15px;margin-top:1px;'>📝</span> <span style='font-style:italic;'><b>Ghi chú:</b> ${transaction.notes}</span></div>` : ''}
          ${cancelButton}
        </div>
      `;
    }).join('');
  }

  // Get status text
  function getStatusText(status) {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'pending': return 'Đang xử lý';
      case 'failed': return 'Thất bại';
      default: return status;
    }
  }

  // Format VND currency
  function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  // Handle withdrawal form submission
  function setupWithdrawalForm() {
    console.log('Setting up withdrawal form...');
    const withdrawalForm = document.getElementById('withdrawalForm');
    console.log('Withdrawal form element:', withdrawalForm);
    
    if (withdrawalForm) {
      // Remove existing event listener to prevent duplicates
      withdrawalForm.removeEventListener('submit', handleWithdrawal);
      // Add new event listener
      withdrawalForm.addEventListener('submit', handleWithdrawal);
      console.log('Withdrawal form event listener attached successfully');
      
      // Setup withdrawal method change handler
      const withdrawalMethod = document.getElementById('withdrawalMethod');
      const bankSelectionGroup = document.getElementById('bankSelectionGroup');
      const bankName = document.getElementById('bankName');
      
      if (withdrawalMethod && bankSelectionGroup && bankName) {
        withdrawalMethod.addEventListener('change', function() {
          if (this.value === 'bank') {
            bankSelectionGroup.style.display = 'block';
            bankName.required = true;
          } else {
            bankSelectionGroup.style.display = 'none';
            bankName.required = false;
            bankName.value = '';
          }
        });
      }
    } else {
      console.error('Withdrawal form element not found!');
    }
  }

  // Handle withdrawal
  async function handleWithdrawal(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const withdrawalMethod = formData.get('withdrawalMethod') || document.getElementById('withdrawalMethod').value;
    const bankName = formData.get('bankName') || document.getElementById('bankName').value;
    
    const withdrawalData = {
      method: withdrawalMethod,
      accountInfo: formData.get('accountInfo') || document.getElementById('accountInfo').value,
      accountName: formData.get('accountName') || document.getElementById('accountName').value,
      amount: parseInt(formData.get('withdrawalAmount') || document.getElementById('withdrawalAmount').value)
    };
    
    // Add bank name to withdrawal data if bank transfer is selected
    if (withdrawalMethod === 'bank') {
      withdrawalData.bankName = bankName;
    }
    
    const adjustedAvailable = window._designerAdjustedAvailable || 0;
    
    if (!withdrawalData.method || !withdrawalData.accountInfo || !withdrawalData.accountName || !withdrawalData.amount) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }
    
    // Validate bank selection for bank transfers
    if (withdrawalData.method === 'bank' && !withdrawalData.bankName) {
      alert('Vui lòng chọn ngân hàng');
      return;
    }
    
    if (withdrawalData.amount < 50000) {
      alert('Số tiền rút tối thiểu là 50,000₫');
      return;
    }
    
    if (withdrawalData.amount > adjustedAvailable) {
      alert('Số tiền rút không được vượt quá số tiền có thể rút (đã trừ các yêu cầu đang chờ xử lý)');
      return;
    }
    
    if (!confirm(`Bạn có chắc chắn muốn rút ${formatVND(withdrawalData.amount)}?`)) {
      return;
    }
    
    try {
      const withdrawBtn = document.getElementById('withdrawBtn');
      withdrawBtn.disabled = true;
      withdrawBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';
      
      const res = await fetch('http://localhost:5000/api/designer/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(withdrawalData)
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Lỗi khi rút tiền');
      }
      
      const result = await res.json();
      
      // Show success popup with processing time information
      showWithdrawalSuccessPopup(result.transactionId, withdrawalData.amount, withdrawalData.method);
      
      event.target.reset();
      
      // Hide bank selection after successful submission
      const bankSelectionGroup = document.getElementById('bankSelectionGroup');
      if (bankSelectionGroup) {
        bankSelectionGroup.style.display = 'none';
      }
      
      loadDesignerStats();
    } catch (error) {
      console.error('Withdrawal error:', error);
      alert(`Lỗi khi rút tiền: ${error.message}`);
    } finally {
      const withdrawBtn = document.getElementById('withdrawBtn');
      withdrawBtn.disabled = false;
      withdrawBtn.innerHTML = '<i class="fas fa-arrow-right"></i> Rút tiền ngay';
    }
  }

  // Show withdrawal success popup with processing time
  function showWithdrawalSuccessPopup(transactionId, amount, method) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.35);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Segoe UI', 'Arial', sans-serif;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: #fff;
      padding: 36px 32px 28px 32px;
      border-radius: 18px;
      max-width: 440px;
      width: 95vw;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      position: relative;
      font-family: 'Segoe UI', 'Arial', sans-serif;
      letter-spacing: 0.01em;
    `;
    
    // Format method display
    let methodDisplay = method.toUpperCase();
    if (method === 'bank') {
      methodDisplay = 'CHUYỂN KHOẢN NGÂN HÀNG';
    }
    
    modalContent.innerHTML = `
      <div style="margin-bottom: 18px;">
        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; box-shadow: 0 2px 12px rgba(67,233,123,0.15);">
          <i class="fas fa-check" style="color: white; font-size: 32px;"></i>
        </div>
        <h2 style="color: #2e7d32; margin: 0 0 6px 0; font-size: 25px; font-weight: 700; letter-spacing: 0.01em;">Yêu cầu rút tiền thành công!</h2>
        <p style="color: #444; margin: 0; font-size: 15px;">Mã giao dịch: <strong style='color:#2e7d32;'>${transactionId}</strong></p>
      </div>
      
      <div style="background: #f8f9fa; padding: 18px 18px 10px 18px; border-radius: 12px; margin-bottom: 18px; text-align: left; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style='font-size:18px;'>📋</span>
          <span style="font-size: 16px; font-weight: 600; color: #333;">Chi tiết yêu cầu</span>
        </div>
        <div style="display: grid; gap: 7px; font-size: 14.5px;">
          <div><strong>Số tiền:</strong> ${formatVND(amount)}</div>
          <div><strong>Phương thức:</strong> ${methodDisplay}</div>
          <div><strong>Trạng thái:</strong> <span style="color: #ff9800; font-weight: 600;">Đang chờ xử lý</span></div>
        </div>
      </div>
      
      <div style="background: #e8f5e9; padding: 18px 18px 10px 18px; border-radius: 12px; margin-bottom: 18px; border-left: 5px solid #43e97b; text-align: left; box-shadow: 0 1px 4px rgba(67,233,123,0.07);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style='font-size:18px;'>⏰</span>
          <span style="font-size: 16px; font-weight: 600; color: #2e7d32;">Thời gian xử lý</span>
        </div>
        <div style="font-size: 15px; color: #2e7d32; font-weight: 600; margin-bottom: 2px;">Yêu cầu của bạn sẽ được xử lý trong vòng <strong>24-48 giờ</strong></div>
        <div style="font-size: 13.5px; color: #2e7d32;">Bạn sẽ nhận được email thông báo khi yêu cầu được xử lý (hoàn thành hoặc thất bại)</div>
      </div>
      
      <div style="background: #fffbe6; padding: 15px 18px 10px 18px; border-radius: 12px; margin-bottom: 22px; border-left: 5px solid #ffc107; text-align: left; box-shadow: 0 1px 4px rgba(255,193,7,0.07);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style='font-size:18px;'>💡</span>
          <span style="font-size: 16px; font-weight: 600; color: #856404;">Lưu ý</span>
        </div>
        <ul style="color: #856404; margin: 0; padding-left: 20px; font-size: 13.5px; text-align: left; line-height: 1.7;">
          <li>Bạn có thể hủy yêu cầu này trong phần <b>"Lịch sử rút tiền"</b> nếu cần</li>
          <li>Đảm bảo thông tin tài khoản chính xác để tránh lỗi</li>
          <li>Liên hệ hỗ trợ nếu có thắc mắc</li>
        </ul>
      </div>
      
      <button onclick="this.closest('.withdrawal-success-modal').remove()" style="
        background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
        color: white;
        border: none;
        padding: 13px 0;
        border-radius: 9px;
        font-size: 17px;
        font-weight: 700;
        width: 100%;
        margin-top: 2px;
        box-shadow: 0 2px 8px rgba(67,233,123,0.10);
        cursor: pointer;
        transition: background 0.2s;
        letter-spacing: 0.01em;
      " onmouseover="this.style.background='#38f9d7'" onmouseout="this.style.background='linear-gradient(90deg, #43e97b 0%, #38f9d7 100%)'">
        Đã hiểu
      </button>
    `;
    
    modal.appendChild(modalContent);
    modal.className = 'withdrawal-success-modal';
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // Cancel withdrawal function
  async function cancelWithdrawal(transactionId, amount) {
    if (!confirm(`Bạn có chắc chắn muốn hủy yêu cầu rút tiền ${formatVND(amount)}?\n\nHành động này không thể hoàn tác.`)) {
      return;
    }
    
    try {
      const res = await fetch(`http://localhost:5000/api/designer/withdrawals/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Lỗi khi hủy yêu cầu rút tiền');
      }
      
      const result = await res.json();
      alert('Hủy yêu cầu rút tiền thành công!');
      
      // Reload stats and transactions
      loadDesignerStats();
      
    } catch (error) {
      console.error('Cancel withdrawal error:', error);
      alert(`Lỗi khi hủy yêu cầu rút tiền: ${error.message}`);
    }
  }

  fetchDesigns();
  
  // Set up withdrawal form on page load as fallback
  setTimeout(() => {
    setupWithdrawalForm();
  }, 1000);

  // Attach cancelWithdrawal to window at the very end to ensure global scope
  window.cancelWithdrawal = cancelWithdrawal;
}); 