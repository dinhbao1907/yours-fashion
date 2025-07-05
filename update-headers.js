const fs = require('fs');
const path = require('path');

const htmlFiles = [
  'about.html',
  'all-products.html',
  'cart.html',
  'checkout.html',
  'design.html',
  'designer-store.html',
  'designer-shop.html',
  'products.html',
  'user-profile.html',
  'payment-success.html'
];

// Pages that should NOT have login modal for "Thiết kế" button
const pagesWithoutLoginModal = ['all-products.html', 'about.html', 'cart.html', 'checkout.html', 'products.html', 'user-profile.html', 'payment-success.html'];

const headerStart = '<header class="header">';
const headerEnd = '</header>';

function extractHeader(html) {
  const start = html.indexOf(headerStart);
  const end = html.indexOf(headerEnd, start);
  if (start === -1 || end === -1) return null;
  return html.substring(start, end + headerEnd.length);
}

function extractHeaderScripts(html) {
  // Look for script tags that contain header-related functions
  const scriptRegex = /<script>[\s\S]*?(?:toggleDropdown|activateTab|showLoginModal|logout|checkAuth)[\s\S]*?<\/script>/gi;
  const scripts = [];
  let match;
  
  while ((match = scriptRegex.exec(html)) !== null) {
    scripts.push(match[0]);
  }
  
  return scripts.join('\n');
}

function extractAccountButtonLogic(html) {
  // Extract the script that swaps account button for unauthenticated users
  const accountScriptRegex = /<script>[\s\S]*?Swap account button for unauthenticated users[\s\S]*?<\/script>/gi;
  const match = accountScriptRegex.exec(html);
  return match ? match[0] : '';
}

function extractRoleLogic(html) {
  // Extract the script that hides designer store menu for non-designers
  const roleScriptRegex = /<script>[\s\S]*?Hide 'Cửa hàng của tôi' for non-designers[\s\S]*?<\/script>/gi;
  const match = roleScriptRegex.exec(html);
  return match ? match[0] : '';
}

const indexHtml = fs.readFileSync('index.html', 'utf8');
const unifiedHeader = extractHeader(indexHtml);
const headerScripts = extractHeaderScripts(indexHtml);
const accountButtonLogic = extractAccountButtonLogic(indexHtml);
const roleLogic = extractRoleLogic(indexHtml);

if (!unifiedHeader) {
  console.error('Could not find header in index.html!');
  process.exit(1);
}

htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Update header HTML
  const start = html.indexOf(headerStart);
  const end = html.indexOf(headerEnd, start);
  if (start === -1 || end === -1) {
    console.log(`No header found in ${file}, skipping.`);
    return;
  }
  
  const before = html.substring(0, start);
  const after = html.substring(end + headerEnd.length);
  
  // Remove existing header scripts if they exist
  const scriptRegex = /<script>[\s\S]*?(?:toggleDropdown|activateTab|showLoginModal|logout|checkAuth)[\s\S]*?<\/script>/gi;
  let cleanedAfter = after.replace(scriptRegex, '');
  
  // Create page-specific scripts
  let pageScripts = '';
  
  if (pagesWithoutLoginModal.includes(file)) {
    // For pages without login modal, modify activateTab function
    pageScripts = `
  <script>
    // Function to toggle dropdown
    function toggleDropdown() {
      const dropdown = document.getElementById('userDropdown');
      if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
      } else {
        dropdown.classList.add('show');
      }
    }

    // Function to activate tab (without login modal)
    function activateTab(tabName) {
      event.preventDefault(); // Prevent default button behavior
      if (tabName === 'home') {
        window.location.replace('index.html');
      } else if (tabName === 'design') {
        // Just redirect to design.html without login check
        window.location.replace('design.html');
      }
    }

    // Modal functions (kept for compatibility but not used)
    function showLoginModal() {
      const modal = document.getElementById('loginRequiredModal');
      modal.style.display = 'block';
    }

    function closeLoginModal() {
      const modal = document.getElementById('loginRequiredModal');
      modal.style.display = 'none';
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

    // Set active state based on current page
    document.addEventListener('DOMContentLoaded', () => {
      const currentPage = window.location.pathname.split('/').pop();
      if (currentPage === '${file}') {
        const currentBtn = document.querySelector('button[onclick*="${file}"]');
        if (currentBtn) currentBtn.classList.add('active');
      }
    });
  </script>`;
  } else {
    // Use original header scripts for pages that need login modal
    pageScripts = headerScripts;
  }
  
  // Add all scripts before </body>
  const bodyEnd = cleanedAfter.lastIndexOf('</body>');
  if (bodyEnd !== -1) {
    const beforeBody = cleanedAfter.substring(0, bodyEnd);
    const afterBody = cleanedAfter.substring(bodyEnd);
    cleanedAfter = beforeBody + '\n  ' + pageScripts + '\n  ' + roleLogic + '\n  ' + accountButtonLogic + '\n  ' + afterBody;
  }
  
  const updated = before + unifiedHeader + cleanedAfter;
  fs.writeFileSync(filePath, updated, 'utf8');
  console.log(`Updated header and scripts in ${file}`);
});

console.log('All headers and scripts updated!'); 