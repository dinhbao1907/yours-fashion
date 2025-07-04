document.addEventListener('DOMContentLoaded', async () => {
  // Force-hide login modal on every page load
  const loginModal = document.getElementById('loginRequiredModal');
  if (loginModal) {
    loginModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  // Gắn sự kiện cho các nút kích cỡ
  const sizeButtons = document.querySelectorAll('.size-btn');
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => {
        b.style.backgroundColor = '#fff';
        b.classList.remove('selected');
      });
      btn.style.backgroundColor = '#e0e0e0';
      btn.classList.add('selected');
    });
  });

  // Gắn sự kiện cho nút Thêm vào giỏ hàng
  const addToCartBtn = document.querySelector('.add-to-cart');
  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', (e) => {
      e.preventDefault(); // Prevent default form or button behavior
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        showLoginModal();
        return; // Stop here for unauthenticated users
      }
      // Get product info
      const productId = document.getElementById('productId')?.value || designId || '';
      const name = document.getElementById('productName').textContent;
      const price = document.getElementById('productPrice').textContent.replace(/[^\d]/g, '');
      const image = document.querySelector('.product-image img').src;
      const description = document.querySelector('.product-description p').textContent;
      const size = document.querySelector('.size-btn.selected')?.textContent || 'M';
      const quantity = parseInt(document.getElementById('productQuantity')?.value || '1', 10);
      // Get cart from localStorage
      const cartKey = getCartKey();
      let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
      // Check if product with same id and size is already in cart
      let item = cart.find(i => i.productId === productId && i.size === size);
      if (item) {
        item.quantity += quantity;
      } else {
        cart.push({ productId, designId, name, price, image, description, quantity, size, checked: true });
      }
      // Remove purchased products from cart
      const purchased = getPurchasedProducts();
      cart = cart.filter(i => !purchased.some(p => p.designId === i.designId && p.size === i.size));
      localStorage.setItem(cartKey, JSON.stringify(cart));
      console.log('Cart after add:', cart);
      showToast('Đã thêm vào giỏ hàng!'); // Use toast instead of alert
    });
  }

  // Gắn sự kiện cho nút Mua ngay
  const buyNowBtn = document.querySelector('.buy-now');
  if (buyNowBtn) {
    buyNowBtn.addEventListener('click', (e) => {
      e.preventDefault();
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      if (!token) {
        showLoginModal();
        return; // Stop here for unauthenticated users
      }
      // Get product info
      const productId = document.getElementById('productId')?.value || designId || '';
      const name = document.getElementById('productName').textContent;
      const price = document.getElementById('productPrice').textContent.replace(/[^\d]/g, '');
      const image = document.querySelector('.product-image img').src;
      const description = document.querySelector('.product-description p').textContent;
      const size = document.querySelector('.size-btn.selected')?.textContent || 'M';
      const quantity = parseInt(document.getElementById('productQuantity')?.value || '1', 10);
      // Save to a temporary buyNowItem in localStorage
      const buyNowItem = { productId, designId, name, price, image, description, quantity, size };
      localStorage.setItem('buyNowItem', JSON.stringify(buyNowItem));
      window.location.href = 'checkout.html?buynow=1';
    });
  }

  // Gắn sự kiện cho nút Đánh giá của bạn
  const reviewBtn = document.querySelector('.customer-btn');
  if (reviewBtn) {
    reviewBtn.addEventListener('click', () => {
      openReviewModal();
    });
  }

  // Ẩn modal khi load trang
  const modal = document.getElementById('reviewModal');
  if (modal) {
    modal.classList.remove('show');
  }

  // Global variable for selected rating
  let selectedRating = 0;

  // --- Dynamic Designer Product Details ---
  const urlParams = new URLSearchParams(window.location.search);
  const designId = urlParams.get('designId');
  if (designId) {
    try {
      const response = await fetch('https://yoursfashion.id.vn/api/designs');
      const designs = await response.json();
      const design = designs.find(d => d.designId === designId);
      if (design) {
        // Update product image
        let imageSrc = '';
        if (design.designImage && design.designImage.startsWith('data:image/')) {
          imageSrc = design.designImage;
        } else if (design.productType && design.productType.toLowerCase().includes('hoodie')) {
          imageSrc = 'resources/hoodie-demo.png';
        } else {
          imageSrc = 'resources/tshirt-model.png';
        }
        document.getElementById('productImage').src = imageSrc;
        // Update product details
        document.getElementById('productName').textContent = design.name || design.productType || '';
        document.getElementById('designerName').textContent = design.username || design.designerName || 'Designer';
        document.getElementById('productPrice').textContent = (design.price ? design.price.toLocaleString() : '') + ' VND';
        document.getElementById('productCode').textContent = design.productCode || design.designId || '-';
        document.getElementById('productMaterial').textContent = design.material || '-';
        document.getElementById('productColor').textContent = design.color || '-';
        document.getElementById('productDescription').textContent = design.description || '';
        // Add like (heart) button
        const likeContainer = document.createElement('span');
        likeContainer.className = 'likes';
        likeContainer.innerHTML = `<i class="fas fa-heart" id="likeHeart" style="cursor:pointer;"></i> <span id="likeCount">${design.likes || 0}</span> lượt thích`;
        const ratingElem = document.querySelector('.product-details .likes');
        if (ratingElem) {
          ratingElem.replaceWith(likeContainer);
        } else {
          document.querySelector('.product-details .rating').appendChild(likeContainer);
        }
        // Like state (per user, localStorage for demo)
        let liked = false;
        const userLikes = JSON.parse(localStorage.getItem('likedDesigns') || '{}');
        if (userLikes[design.designId]) {
          liked = true;
          document.getElementById('likeHeart').classList.add('liked');
          document.getElementById('likeHeart').style.color = '#e91e63';
        }
        document.getElementById('likeHeart').addEventListener('click', async () => {
          liked = !liked;
          if (liked) {
            document.getElementById('likeHeart').classList.add('liked');
            document.getElementById('likeHeart').style.color = '#e91e63';
            userLikes[design.designId] = true;
            localStorage.setItem('likedDesigns', JSON.stringify(userLikes));
            // Send like to backend
            await fetch(`https://yoursfashion.id.vn/api/designs/${design.designId}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            document.getElementById('likeCount').textContent = (parseInt(document.getElementById('likeCount').textContent) + 1);
          } else {
            document.getElementById('likeHeart').classList.remove('liked');
            document.getElementById('likeHeart').style.color = '';
            delete userLikes[design.designId];
            localStorage.setItem('likedDesigns', JSON.stringify(userLikes));
            // Send unlike to backend
            await fetch(`https://yoursfashion.id.vn/api/designs/${design.designId}/unlike`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            document.getElementById('likeCount').textContent = Math.max(0, parseInt(document.getElementById('likeCount').textContent) - 1);
          }
        });
      }
      await loadReviews(designId);
    } catch (error) {
      document.querySelector('.product-details h1').textContent = 'Không tìm thấy sản phẩm.';
    }
  }
});

// Hàm mở modal
function openReviewModal() {
  const currentUser = localStorage.getItem('currentUser') || getUsernameFromToken() || 'User';
  const currentUserName = localStorage.getItem('currentUserName') || currentUser;
  const userAvatar = localStorage.getItem('userAvatar') || 'resources/user-circle.png';

  const userNameElement = document.getElementById('userName');
  const userAvatarElement = document.getElementById('userAvatar');
  const modal = document.getElementById('reviewModal');

  if (userNameElement && userAvatarElement && modal) {
    userNameElement.textContent = currentUserName;
    userAvatarElement.src = userAvatar;
    modal.classList.add('show');
    // Reset rating and clear stars
    selectedRating = 0;
    document.querySelectorAll('.star-rating i').forEach(s => s.classList.remove('selected'));
    // Attach star rating listeners every time modal is opened
    document.querySelectorAll('.star-rating i').forEach(star => {
      star.onclick = function() {
        selectedRating = parseInt(star.getAttribute('data-value'));
        document.querySelectorAll('.star-rating i').forEach((s, idx) => {
          if (idx < selectedRating) s.classList.add('selected');
          else s.classList.remove('selected');
        });
      };
    });
    // Attach review form submit event listener here
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
      reviewForm.onsubmit = async function(e) {
        e.preventDefault();
        const urlParams = new URLSearchParams(window.location.search);
        const designId = urlParams.get('designId');
        const color = document.getElementById('color').value;
        const size = document.getElementById('size').value;
        const descriptionMatch = document.getElementById('descriptionMatch').value;
        const material = document.getElementById('material').value;
        const feedback = document.getElementById('feedback').value;
        const username = getUsernameFromToken() || localStorage.getItem('currentUser') || 'Ẩn danh';
        const avatar = localStorage.getItem('userAvatar') || 'resources/user-circle.png';
        // Xử lý chọn sao
        const stars = document.querySelectorAll('.star-rating i');
        let selectedRating = 0;
        stars.forEach((star, idx) => {
          if (star.classList.contains('selected')) selectedRating = idx + 1;
        });
        // Validation
        if (!selectedRating) {
          alert('Vui lòng chọn số sao đánh giá!');
          return;
        }
        if (!designId) {
          alert('Không tìm thấy sản phẩm để đánh giá.');
          return;
        }
        if (!color || !size || !descriptionMatch || !material) {
          alert('Vui lòng điền đầy đủ thông tin đánh giá!');
          return;
        }
        if (!feedback.trim()) {
          alert('Vui lòng nhập nhận xét chi tiết!');
          return;
        }
        if (feedback.trim().length < 10) {
          alert('Nhận xét phải có ít nhất 10 ký tự!');
          return;
        }
        // Disable submit button to prevent double submission
        const submitBtn = document.querySelector('.review-submit-btn');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đang gửi...';
        try {
          // Only include avatar if it is not the default
          const reviewData = {
            designId,
            username,
            rating: selectedRating,
            feedback: feedback.trim(),
            color,
            size,
            descriptionMatch,
            material
          };
          if (avatar && avatar !== 'resources/user-circle.png') {
            reviewData.avatar = avatar;
          }
          const response = await fetch('https://yoursfashion.id.vn/api/reviews', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(reviewData)
          });
          const data = await response.json();
          if (response.ok) {
            alert('Cảm ơn bạn đã gửi đánh giá!');
            document.getElementById('reviewForm').reset();
            stars.forEach(s => s.classList.remove('selected'));
            closeReviewModal();
            // Refresh reviews immediately
            loadReviews(designId);
            // Trigger storage event for other tabs
            localStorage.setItem('review_update', JSON.stringify({ designId, timestamp: Date.now() }));
          } else {
            alert(data.message || 'Lỗi khi gửi đánh giá!');
          }
        } catch (error) {
          console.error('Review submission error:', error);
          alert('Lỗi kết nối khi gửi đánh giá! Vui lòng thử lại.');
        } finally {
          // Re-enable submit button
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }
      };
    }
  } else {
    console.error('Một hoặc nhiều phần tử không được tìm thấy:', { userNameElement, userAvatarElement, modal });
  }
}

// Hàm đóng modal
function closeReviewModal() {
  const modal = document.getElementById('reviewModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// --- Dynamic Reviews Section ---
async function loadReviews(designId) {
  const reviewsList = document.querySelector('.reviews-list');
  if (!reviewsList) {
    console.error('Reviews list element not found');
    return;
  }
  reviewsList.innerHTML = '';
  try {
    console.log('Fetching reviews for designId:', designId);
    const response = await fetch(`https://yoursfashion.id.vn/api/reviews?designId=${encodeURIComponent(designId)}`);
    console.log('Reviews API response status:', response.status);
    const reviews = await response.json();
    console.log('Reviews received:', reviews);

    // Fetch overall rating and count from backend
    let overallScore = 0;
    let reviewCount = 0;
    try {
      const statsRes = await fetch(`https://yoursfashion.id.vn/api/review-stats?designId=${encodeURIComponent(designId)}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        overallScore = stats.average;
        reviewCount = stats.count;
        console.log('Review stats:', stats);
      } else {
        overallScore = 0;
        reviewCount = 0;
      }
    } catch (e) {
      overallScore = 0;
      reviewCount = 0;
    }
    // Update stars and review count in product view
    const overallScoreElem = document.querySelector('.overall-score');
    if (overallScoreElem) overallScoreElem.textContent = `${overallScore.toFixed(1)} ★`;
    const ratingCountElem = document.querySelector('.rating-count');
    if (ratingCountElem) ratingCountElem.textContent = `(${reviewCount} đánh giá)`;
    const overallStarsElem = document.querySelector('.overall-rating .stars');
    if (overallStarsElem) overallStarsElem.innerHTML = renderStars(overallScore);
    // Also update stars next to product image
    const productImageStars = document.getElementById('productImageStars');
    if (productImageStars) productImageStars.innerHTML = renderStars(overallScore);

    if (Array.isArray(reviews) && reviews.length > 0) {
      console.log('Rendering', reviews.length, 'reviews');
      reviews.forEach(review => {
        const reviewHTML = `
          <div class="review">
            <div class="review-header">
              <img src="${review.avatar || 'resources/user-circle.png'}" alt="Avatar" class="avatar">
              <div class="review-user">
                <span class="review-username">${review.username}</span>
                <span class="review-date">${new Date(review.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
            <div class="review-rating">${'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}</div>
            <p class="review-text">${review.feedback}</p>
            <div class="review-details">
              <span>Màu: ${review.color || ''}</span>
              <span>Size: ${review.size || ''}</span>
              <span>Đúng với mô tả: ${review.descriptionMatch || ''}</span>
              <span>Chất liệu: ${review.material || ''}</span>
            </div>
            <div class="review-actions">
              <i class="fas fa-thumbs-up"></i>
              <i class="fas fa-thumbs-down"></i>
            </div>
          </div>
        `;
        reviewsList.insertAdjacentHTML('beforeend', reviewHTML);
      });
    } else {
      console.log('No reviews found, showing empty message');
      reviewsList.innerHTML = '<p>Chưa có đánh giá nào cho sản phẩm này.</p>';
    }
  } catch (error) {
    console.error('Error loading reviews:', error);
    reviewsList.innerHTML = '<p>Lỗi khi tải đánh giá.</p>';
  }
}

// Helper to extract username from JWT token
function getUsernameFromToken() {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.username || payload.name || payload.user || null;
  } catch (e) {
    return null;
  }
}

// Helper to render dynamic star icons for a given rating
function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const halfStar = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
  let html = '';
  for (let i = 0; i < fullStars; i++) html += '<i class="fas fa-star"></i>';
  if (halfStar) html += '<i class="fas fa-star-half-alt"></i>';
  for (let i = 0; i < emptyStars; i++) html += '<i class="far fa-star"></i>';
  return html;
}

// Add this helper at the top or before cart logic
function getCartKey() {
  const username = localStorage.getItem('currentUser');
  return username ? `cart_${username}` : 'cart_guest';
}

// Listen for review updates from other tabs
window.addEventListener('storage', function(event) {
  if (event.key === 'review_update' && event.newValue) {
    try {
      const data = JSON.parse(event.newValue);
      const urlParams = new URLSearchParams(window.location.search);
      const designId = urlParams.get('designId');
      if (data.designId && designId && data.designId === designId) {
        loadReviews(designId);
      }
    } catch (e) {}
  }
});

// Helper: get purchased products for current user (returns array of {designId, size})
function getPurchasedProducts() {
  // For demo: store purchased products in localStorage as 'purchasedProducts_USERNAME'
  const username = localStorage.getItem('currentUser');
  if (!username) return [];
  try {
    return JSON.parse(localStorage.getItem('purchasedProducts_' + username)) || [];
  } catch (e) { return []; }
}

// Thank You Popup Functions
function showThankYouPopup() {
  const modal = document.getElementById('thankYouModal');
  if (modal) {
    modal.classList.add('show');
    // Auto-close after 3 seconds
    setTimeout(() => {
      closeThankYouModal();
    }, 3000);
  }
}

function closeThankYouModal() {
  const modal = document.getElementById('thankYouModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

// Close thank you modal when clicking outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('thankYouModal');
  if (modal && e.target === modal) {
    modal.classList.remove('show');
  }
});

// Update product details fetch with error handling
async function updateProductDetails() {
  const designId = getUrlParameter('designId');
  if (!designId) {
    console.error('No design ID provided');
    return;
  }
  try {
    const response = await fetch(`https://yoursfashion.id.vn/api/designs/${designId}`);
    if (!response.ok) {
      throw new Error('Network response was not ok: ' + response.status);
    }
    const design = await response.json();
    // ... (rest of your updateProductDetails code)
  } catch (error) {
    document.querySelector('.product-details h1').textContent = 'Không tìm thấy sản phẩm.';
    console.error('Error fetching product details:', error);
  }
}

// Modal functions for login required popup
function showLoginModal() {
  const modal = document.getElementById('loginRequiredModal');
  if (!modal) return;
  modal.style.display = 'flex';
  // Prevent background scroll
  document.body.style.overflow = 'hidden';
  // Focus trap
  const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
  const focusableEls = modal.querySelectorAll(focusableSelectors);
  if (focusableEls.length) focusableEls[0].focus();
  function trapFocus(e) {
    const firstEl = focusableEls[0];
    const lastEl = focusableEls[focusableEls.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    } else if (e.key === 'Escape') {
      closeLoginModal();
    }
  }
  modal._trapFocusHandler = trapFocus;
  modal.addEventListener('keydown', trapFocus);
}

function closeLoginModal() {
  const modal = document.getElementById('loginRequiredModal');
  if (!modal) return;
  modal.style.display = 'none';
  // Restore background scroll
  document.body.style.overflow = '';
  // Remove focus trap
  if (modal._trapFocusHandler) {
    modal.removeEventListener('keydown', modal._trapFocusHandler);
    delete modal._trapFocusHandler;
  }
}

function goToLogin() {
  window.location.href = 'choose-login.html';
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('loginRequiredModal');
  if (event.target === modal) {
    closeLoginModal();
  }
}

// Add this at the end of the file
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}