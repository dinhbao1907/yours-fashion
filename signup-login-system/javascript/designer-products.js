// Function to render a single product card
function renderProductCard(design) {
  // Use the actual design image if available, otherwise fallback
  let imageSrc = '';
  if (design.designImage && design.designImage.startsWith('data:image/')) {
    imageSrc = design.designImage;
  } else if (design.productType && design.productType.toLowerCase().includes('hoodie')) {
    imageSrc = 'resources/hoodie-demo.png';
  } else {
    imageSrc = 'resources/tshirt-model.png';
  }

  return `
    <div class="product-card" style="cursor:pointer" onclick="window.location.href='products.html?designId=${encodeURIComponent(design.designId)}'">
      <img src="${imageSrc}" alt="${design.productType}">
      <span class="new-label">New</span>
      <h3>${design.name || 'Tên thiết kế'}</h3>
      <p>by <b>${design.username || 'Designer'}</b></p>
      <p class="price">${design.price ? design.price.toLocaleString() : ''} VND</p>
      <button class="btn btn-secondary" onclick="window.location.href='products.html?designId=${encodeURIComponent(design.designId)}'; event.stopPropagation();">Xem sản phẩm</button>
    </div>
  `;
}

// Function to load designer products
function loadDesignerProducts() {
  const container = document.getElementById('designer-products');
  if (!container) return;

  // Show loading state
  container.innerHTML = '<p>Đang tải sản phẩm...</p>';

  // Fetch designs from backend
  fetch('http://localhost:5000/api/designs')
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(designs => {
      if (Array.isArray(designs) && designs.length > 0) {
        // Sort by newest (createdAt or uploadDate descending)
        const sorted = designs.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.uploadDate || 0);
          const dateB = new Date(b.createdAt || b.uploadDate || 0);
          return dateB - dateA;
        });
        // Show only the latest 5
        const latest = sorted.slice(0, 5);
        container.innerHTML = latest.map(renderProductCard).join('');
        // Animate product cards with staggered delay
        const cards = container.querySelectorAll('.product-card');
        cards.forEach((card, idx) => {
          setTimeout(() => {
            card.classList.add('animated');
          }, idx * 100);
        });
      } else {
        container.innerHTML = '<p>Chưa có thiết kế nào được đăng tải.</p>';
      }
    })
    .catch(error => {
      console.error('Error loading designer products:', error);
      container.innerHTML = '<p>Có lỗi xảy ra khi tải sản phẩm. Vui lòng thử lại sau.</p>';
    });
}

// Load products when the page loads
document.addEventListener('DOMContentLoaded', loadDesignerProducts); 