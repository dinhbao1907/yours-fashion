function getQueryParam(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

async function loadProductDetails() {
  const designId = getQueryParam('designId');
  if (!designId) {
    document.getElementById('product-details').innerHTML = '<p>Không tìm thấy sản phẩm.</p>';
    return;
  }

  try {
    const response = await fetch('https://yours-fashion.onrender.com/api/designs');
    const designs = await response.json();
    const design = designs.find(d => d.designId === designId);

    if (!design) {
      document.getElementById('product-details').innerHTML = '<p>Sản phẩm không tồn tại.</p>';
      return;
    }

    let imageSrc = '';
    if (design.designImage && design.designImage.startsWith('data:image/')) {
      imageSrc = design.designImage;
    } else if (design.productType && design.productType.toLowerCase().includes('hoodie')) {
      imageSrc = 'resources/hoodie-demo.png';
    } else {
      imageSrc = 'resources/tshirt-model.png';
    }

    document.getElementById('product-details').innerHTML = `
      <div class="product-details-card">
        <img src="${imageSrc}" alt="${design.productType}" class="product-details-image">
        <h2>${design.productType}</h2>
        <p><strong>Mô tả:</strong> ${design.description || ''}</p>
        <p><strong>Giá:</strong> ${design.price ? design.price.toLocaleString() : ''} VND</p>
        <p><strong>Mã sản phẩm:</strong> ${design.productCode}</p>
        <p><strong>Chất liệu:</strong> ${design.material}</p>
        <p><strong>Màu sắc:</strong> ${design.color}</p>
      </div>
    `;
  } catch (error) {
    document.getElementById('product-details').innerHTML = '<p>Lỗi khi tải chi tiết sản phẩm.</p>';
  }
}

document.addEventListener('DOMContentLoaded', loadProductDetails); 