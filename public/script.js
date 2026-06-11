// Pruksa 20 Landing Page - Frontend Logic

// Global state
let currentImageIndex = 0;
let galleryImages = [];
let isAdminMode = false;

document.addEventListener('DOMContentLoaded', () => {
  // Load gallery images from server or fallback
  loadGallery();

  // Initialize loan calculator
  setupLoanCalculator();
  
  // Initialize countdown timer
  setupCountdown();
  
  // Initialize gallery controls
  setupGallery();
  
  // Initialize hidden admin upload trigger
  setupAdminHiddenTrigger();
  
  // Connect to SSE statistics stream & Register Page View
  connectStatsStream();
  registerPageView();

  // Sticky Navbar shadow on scroll
  window.addEventListener('scroll', () => {
    const nav = document.getElementById('main-nav');
    if (window.scrollY > 50) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });

  // Highlight parenthetical text in red
  highlightParentheses();
});

// --- 0. LOAD AND RENDER GALLERY ---
function loadGallery() {
  fetch('/api/gallery')
    .then(res => res.json())
    .then(data => {
      galleryImages = data;
      renderGalleryGrid();
    })
    .catch(err => {
      console.warn("Failed to load gallery from server, using default static images.");
      galleryImages = [
        { id: 1, src: 'images/hero.png', title: 'ทัศนียภาพหน้าบ้าน', description: 'ทาวน์โฮม 2 ชั้น ตกแต่งพร้อมเข้าอยู่ หน้าบ้านกว้างขวาง' },
        { id: 2, src: 'images/living.png', title: 'ห้องนั่งเล่นระดับพรีเมียม', description: 'ดีไซน์คลาสสิก อบอุ่น ผ่อนคลายสำหรับครอบครัว' },
        { id: 3, src: 'images/bedroom.png', title: 'ห้องนอนใหญ่ (Master Bedroom)', description: 'พื้นที่กว้างขวาง ปลอดโปร่ง เตียงคิงไซส์สบายตา' },
        { id: 4, src: 'images/park.png', title: 'สวนสาธารณะ (ตรงข้ามบ้านพอดี)', description: 'ต้นโครงการ วิวสวนสีเขียว ร่มรื่น อากาศบริสุทธิ์' }
      ];
      renderGalleryGrid();
    });
}

function getCleanTitle(title) {
  if (!title) return 'ทั่วไป';
  return title.replace(/\s*\(\d+\)\s*$/, '').trim();
}

function groupGalleryImages() {
  const groups = {};
  galleryImages.forEach((img) => {
    const cleanTitle = getCleanTitle(img.title);
    if (!groups[cleanTitle]) {
      groups[cleanTitle] = [];
    }
    groups[cleanTitle].push(img);
  });
  return groups;
}

function renderGalleryGrid() {
  const grid = document.getElementById('gallery-image-grid');
  if (!grid) return;
  
  const groups = groupGalleryImages();
  let gridHtml = '';
  
  const uniqueTitles = [];
  galleryImages.forEach(img => {
    const cleanTitle = getCleanTitle(img.title);
    if (!uniqueTitles.includes(cleanTitle)) {
      uniqueTitles.push(cleanTitle);
    }
  });

  uniqueTitles.forEach((title, index) => {
    const items = groups[title];
    const firstItem = items[0];
    const isMain = index === 0 ? 'main-image' : '';
    const escapedTitle = title.replace(/'/g, "\\'");
    
    // Admin delete button (per card)
    const deleteBtn = isAdminMode ? `<button class="card-delete-btn" onclick="event.stopPropagation(); deleteGalleryGroup('${escapedTitle}')" title="ลบ">🗑️</button>` : '';
    
    if (items.length === 1) {
      gridHtml += `
        <div class="gallery-item ${isMain}" onclick="openGroupLightbox('${escapedTitle}', 0)">
          ${deleteBtn}
          <img src="${firstItem.src}" alt="${firstItem.title}" loading="lazy">
          <div class="item-overlay">
            <span class="view-tag">🔍 ขยายรูปภาพ</span>
            <div class="overlay-info">
              <h4>${firstItem.title}</h4>
              <p>${firstItem.description || ''}</p>
            </div>
          </div>
        </div>
      `;
    } else {
      gridHtml += `
        <div class="gallery-item folder-item ${isMain}" onclick="openGroupLightbox('${escapedTitle}', 0)">
          ${deleteBtn}
          <div class="folder-stack">
            <img src="${firstItem.src}" alt="${firstItem.title}" loading="lazy">
          </div>
          <div class="folder-badge">📁 ${items.length} รูป</div>
          <div class="item-overlay">
            <span class="view-tag">📁 เปิดอัลบั้ม (${items.length} รูป)</span>
            <div class="overlay-info">
              <h4>${title}</h4>
              <p>${firstItem.description || 'อัลบั้มภาพถ่ายสถานที่จริง'}</p>
            </div>
          </div>
        </div>
      `;
    }
  });
  
  grid.innerHTML = gridHtml;
}

// --- 1. COUNTDOWN TIMER ---
function setupCountdown() {
  // Set target date to 3 days in the future
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + 3);
  targetDate.setHours(targetDate.getHours() + 4);

  function updateTimer() {
    const now = new Date().getTime();
    const difference = targetDate.getTime() - now;

    if (difference <= 0) {
      clearInterval(timerInterval);
      document.getElementById('countdown-display').innerHTML = "โปรโมชั่นหมดเวลาแล้ว! ติดต่อเจ้าหน้าที่ด่วน";
      return;
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
  }

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);
}

// --- 2. LOAN CALCULATOR ---
function setupLoanCalculator() {
  const priceInput = document.getElementById('input-price');
  const downInput = document.getElementById('input-down');
  const interestInput = document.getElementById('input-interest');
  const yearsSelect = document.getElementById('input-years');

  const updateCalculation = () => {
    const price = parseFloat(priceInput.value) || 0;
    const down = parseFloat(downInput.value) || 0;
    const annualInterestRate = parseFloat(interestInput.value) || 0;
    const years = parseInt(yearsSelect.value) || 30;

    let loanAmount = price - down;
    if (loanAmount < 0) loanAmount = 0;

    // Amortization formula
    const r = (annualInterestRate / 12) / 100;
    const n = years * 12;

    let monthlyPayment = 0;
    if (loanAmount > 0) {
      if (r > 0) {
        monthlyPayment = loanAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      } else {
        monthlyPayment = loanAmount / n;
      }
    }

    // Update UI
    document.getElementById('calc-loan-amount').textContent = Math.round(loanAmount).toLocaleString();
    document.getElementById('calc-monthly-pay').textContent = Math.round(monthlyPayment).toLocaleString();
  };

  [priceInput, downInput, interestInput].forEach(input => {
    input.addEventListener('input', updateCalculation);
  });
  yearsSelect.addEventListener('change', updateCalculation);

  updateCalculation();
}

// --- 3. LIGHTBOX GALLERY ---
function setupGallery() {
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('lightbox-modal');
    if (modal.style.display === 'block') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') changeLightboxImage(-1);
      if (e.key === 'ArrowRight') changeLightboxImage(1);
    }
  });
}

let lightboxImagesList = [];

function openLightbox(index) {
  lightboxImagesList = galleryImages;
  if (index < 0 || index >= lightboxImagesList.length) return;
  currentImageIndex = index;
  
  const modal = document.getElementById('lightbox-modal');
  modal.style.display = 'block';
  updateLightboxContent();
  document.body.style.overflow = 'hidden';
}

function openGroupLightbox(groupTitle, startIndex = 0) {
  const groups = groupGalleryImages();
  lightboxImagesList = groups[groupTitle] || [];
  if (startIndex < 0 || startIndex >= lightboxImagesList.length) return;
  currentImageIndex = startIndex;
  
  const modal = document.getElementById('lightbox-modal');
  modal.style.display = 'block';
  updateLightboxContent();
  document.body.style.overflow = 'hidden';
}

function updateLightboxContent() {
  if (lightboxImagesList.length === 0) {
    closeLightbox();
    return;
  }
  if (currentImageIndex >= lightboxImagesList.length) {
    currentImageIndex = lightboxImagesList.length - 1;
  }
  const currentImg = lightboxImagesList[currentImageIndex];
  document.getElementById('lightbox-img').src = currentImg.src;
  
  const counterText = lightboxImagesList.length > 1 ? ` (${currentImageIndex + 1}/${lightboxImagesList.length})` : '';
  document.getElementById('lightbox-caption').textContent = `${currentImg.title}${counterText}${currentImg.description ? ' - ' + currentImg.description : ''}`;

  // Show/hide delete button based on admin mode
  const delBtn = document.getElementById('lightbox-delete-btn');
  if (delBtn) {
    delBtn.style.display = isAdminMode ? 'flex' : 'none';
  }

  // Show/hide edit button based on admin mode
  const editBtn = document.getElementById('lightbox-edit-btn');
  if (editBtn) {
    editBtn.style.display = isAdminMode ? 'flex' : 'none';
  }
}

function closeLightbox() {
  document.getElementById('lightbox-modal').style.display = 'none';
  document.body.style.overflow = '';
}

function changeLightboxImage(direction) {
  if (lightboxImagesList.length === 0) return;
  currentImageIndex = (currentImageIndex + direction + lightboxImagesList.length) % lightboxImagesList.length;
  updateLightboxContent();
}

// --- Delete Gallery Functions ---
function deleteCurrentImage() {
  if (!isAdminMode || lightboxImagesList.length === 0) return;
  
  const currentImg = lightboxImagesList[currentImageIndex];
  if (!confirm(`ต้องการลบรูปภาพ "${currentImg.title}" ใช่หรือไม่?`)) return;

  fetch('/api/gallery/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: [currentImg.id] })
  })
  .then(res => res.json())
  .then(data => {
    showToast(`🗑️ ลบรูปภาพ "${currentImg.title}" สำเร็จแล้ว`);
  })
  .catch(err => {
    console.warn('Server offline, deleting locally', err);
    showToast(`🗑️ ลบรูปภาพ "${currentImg.title}" สำเร็จ (ออฟไลน์)`);
  });

  // Remove from global state
  galleryImages = galleryImages.filter(img => img.id !== currentImg.id);
  lightboxImagesList = lightboxImagesList.filter(img => img.id !== currentImg.id);

  if (lightboxImagesList.length === 0) {
    closeLightbox();
  } else {
    if (currentImageIndex >= lightboxImagesList.length) {
      currentImageIndex = lightboxImagesList.length - 1;
    }
    updateLightboxContent();
  }
  renderGalleryGrid();
}

function deleteGalleryGroup(groupTitle) {
  const groups = groupGalleryImages();
  const items = groups[groupTitle];
  if (!items || items.length === 0) return;

  const confirmMsg = items.length > 1 
    ? `ต้องการลบอัลบั้ม "${groupTitle}" (${items.length} รูป) ทั้งหมดใช่หรือไม่?`
    : `ต้องการลบรูปภาพ "${groupTitle}" ใช่หรือไม่?`;
  
  if (!confirm(confirmMsg)) return;

  const ids = items.map(img => img.id);
  
  fetch('/api/gallery/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: ids })
  })
  .then(res => res.json())
  .then(data => {
    showToast(`🗑️ ลบ "${groupTitle}" สำเร็จแล้ว (${items.length} รูป)`);
  })
  .catch(err => {
    console.warn('Server offline, deleting locally', err);
    showToast(`🗑️ ลบ "${groupTitle}" สำเร็จ (ออฟไลน์)`);
  });

  // Remove from global state
  galleryImages = galleryImages.filter(img => !ids.includes(img.id));
  renderGalleryGrid();
}

// --- Edit Gallery Functions ---
function openEditModal() {
  if (!isAdminMode || lightboxImagesList.length === 0) return;
  const currentImg = lightboxImagesList[currentImageIndex];
  
  document.getElementById('editImageId').value = currentImg.id;
  document.getElementById('edit-title').value = currentImg.title;
  document.getElementById('edit-desc').value = currentImg.description || '';
  
  const modal = document.getElementById('edit-modal');
  modal.classList.add('active');
}

function closeEditModal() {
  const modal = document.getElementById('edit-modal');
  modal.classList.remove('active');
  
  // Reset form
  document.getElementById('editForm').reset();
  document.getElementById('edit-image-preview-container').style.display = 'none';
  document.getElementById('edit-image-preview').src = '';
}

function handleEditFileSelect(event) {
  const file = event.target.files[0];
  const previewContainer = document.getElementById('edit-image-preview-container');
  const previewImg = document.getElementById('edit-image-preview');
  
  if (file) {
    if (!file.type.match('image.*')) {
      showToast('กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น', 'error');
      event.target.value = '';
      previewContainer.style.display = 'none';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      previewContainer.style.display = 'block';
    };
    reader.readAsDataURL(file);
  } else {
    previewContainer.style.display = 'none';
  }
}

function handleEditSubmit(event) {
  event.preventDefault();
  
  const id = Number(document.getElementById('editImageId').value);
  const title = document.getElementById('edit-title').value.trim();
  const description = document.getElementById('edit-desc').value.trim();
  const fileInput = document.getElementById('edit-image-file');
  
  if (!title) {
    showToast('กรุณากรอกชื่อรูปภาพ', 'error');
    return;
  }
  
  const submitBtn = document.getElementById('submit-edit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '⏳ กำลังบันทึก...';
  
  // Build FormData for file uploading capability
  const formData = new FormData();
  formData.append('id', id);
  formData.append('title', title);
  formData.append('description', description);
  if (fileInput.files.length > 0) {
    formData.append('imageFile', fileInput.files[0]);
  }
  
  fetch('/api/gallery/edit', {
    method: 'POST',
    body: formData // Multer handles multipart form data on server
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      showToast('✏️ แก้ไขและเปลี่ยนรูปภาพเรียบร้อยแล้ว');
      closeEditModal();
      
      // Update local state for the edited image (including src if updated)
      const imgIdx = galleryImages.findIndex(img => img.id === id);
      if (imgIdx !== -1) {
        galleryImages[imgIdx].title = title;
        galleryImages[imgIdx].description = description;
        if (data.item && data.item.src) {
          galleryImages[imgIdx].src = data.item.src;
        }
      }
      
      // Also update in lightbox image list
      const lbImgIdx = lightboxImagesList.findIndex(img => img.id === id);
      if (lbImgIdx !== -1) {
        lightboxImagesList[lbImgIdx].title = title;
        lightboxImagesList[lbImgIdx].description = description;
        if (data.item && data.item.src) {
          lightboxImagesList[lbImgIdx].src = data.item.src;
        }
      }
      
      // Re-render
      renderGalleryGrid();
      updateLightboxContent();
    } else {
      showToast(data.error || 'เกิดข้อผิดพลาดในการแก้ไขรูปภาพ', 'error');
    }
  })
  .catch(err => {
    console.error(err);
    showToast('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ในการอัปโหลดไฟล์ใหม่', 'error');
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 บันทึกการแก้ไข';
  });
}

// --- 4. UPLOAD MODAL & HANDLERS ---
function openUploadModal() {
  const modal = document.getElementById('upload-modal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeUploadModal() {
  const modal = document.getElementById('upload-modal');
  modal.classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('uploadForm').reset();
  removePreview();
}

function handleFileSelect(event) {
  const files = event.target.files;
  const previewGrid = document.getElementById('previewGrid');
  if (!previewGrid) return;
  
  previewGrid.innerHTML = '';
  
  if (files.length > 0) {
    let validFilesCount = 0;
    
    Array.from(files).forEach(file => {
      if (!file.type.match('image.*')) {
        return;
      }
      
      validFilesCount++;
      const reader = new FileReader();
      reader.onload = function(e) {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
        previewGrid.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
    
    if (validFilesCount > 0) {
      document.getElementById('uploadPreview').style.display = 'block';
      document.getElementById('upload-prompt').style.display = 'none';
    } else {
      showToast('กรุณาเลือกเฉพาะไฟล์รูปภาพเท่านั้น', 'error');
      removePreview();
    }
  }
}

function removePreview(event) {
  if (event) {
    event.stopPropagation();
  }
  document.getElementById('imageInput').value = '';
  const previewGrid = document.getElementById('previewGrid');
  if (previewGrid) {
    previewGrid.innerHTML = '';
  }
  document.getElementById('uploadPreview').style.display = 'none';
  document.getElementById('upload-prompt').style.display = 'block';
}

function handleUploadSubmit(event) {
  event.preventDefault();
  
  const fileInput = document.getElementById('imageInput');
  const title = document.getElementById('upload-title').value.trim();
  const desc = document.getElementById('upload-desc').value.trim();
  
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('กรุณาเลือกไฟล์รูปภาพก่อน', 'error');
    return;
  }
  
  const formData = new FormData();
  // Append all selected files to the 'images' field (plural to match backend)
  Array.from(fileInput.files).forEach(file => {
    formData.append('images', file);
  });
  formData.append('title', title);
  formData.append('description', desc);
  
  const submitBtn = document.getElementById('submit-upload-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'กำลังอัปโหลด...';
  
  fetch('/api/upload', {
    method: 'POST',
    body: formData
  })
  .then(res => {
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  })
  .then(data => {
    showToast(`อัปโหลดรูปภาพสำเร็จ ${data.items ? data.items.length : 1} รูปแล้ว!`);
    closeUploadModal();
    loadGallery(); // Reload gallery
  })
  .catch(err => {
    console.error(err);
    
    // Local / Offline fallback for multiple files
    let processedCount = 0;
    const totalFiles = fileInput.files.length;
    
    Array.from(fileInput.files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = function(e) {
        let imgTitle = title;
        if (!imgTitle) {
          const lastDot = file.name.lastIndexOf('.');
          imgTitle = lastDot !== -1 ? file.name.substring(0, lastDot) : file.name;
        } else if (totalFiles > 1) {
          imgTitle = `${title} (${index + 1})`;
        }
        
        const newItem = {
          id: Date.now() + index,
          src: e.target.result,
          title: imgTitle,
          description: desc
        };
        galleryImages.push(newItem);
        processedCount++;
        
        if (processedCount === totalFiles) {
          renderGalleryGrid();
          closeUploadModal();
          showToast(`อัปโหลดสำเร็จ ${totalFiles} รูป (จำลองในบราวเซอร์)`);
        }
      };
      reader.readAsDataURL(file);
    });
  })
  .finally(() => {
    submitBtn.disabled = false;
    submitBtn.textContent = '💾 อัปโหลดรูปภาพ';
  });
}
// --- 5. REAL-TIME STATS (SSE & Fallbacks) ---
let isConnectedSSE = false;

function connectStatsStream() {
  const ticker = document.getElementById('activity-ticker-list');
  
  try {
    const eventSource = new EventSource('/api/stats-stream');
    
    eventSource.onopen = () => {
      isConnectedSSE = true;
      console.log('Successfully connected to SSE stats stream');
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'statsUpdate') {
        updateStatsUI(data.activeUsers, data.totalViews, data.totalInquiries);
      } else if (data.type === 'newActivity') {
        appendActivityItem(data.activity);
      } else if (data.type === 'galleryUpdate') {
        // Another user uploaded a photo! Add to state & re-render.
        const exists = galleryImages.some(img => img.id === data.item.id);
        if (!exists) {
          galleryImages.push(data.item);
          renderGalleryGrid();
          showToast(`📸 รูปภาพใหม่ "${data.item.title}" ได้ถูกอัปโหลดจากผู้ใช้คนอื่น`, 'info');
        }
      } else if (data.type === 'galleryDelete') {
        // Another user/admin deleted photos!
        const beforeCount = galleryImages.length;
        galleryImages = galleryImages.filter(img => !data.ids.includes(img.id));
        if (galleryImages.length !== beforeCount) {
          renderGalleryGrid();
          // If lightbox is open and current image/list is affected, update it
          if (document.getElementById('lightbox-modal').style.display === 'block') {
            lightboxImagesList = lightboxImagesList.filter(img => !data.ids.includes(img.id));
            if (lightboxImagesList.length === 0) {
              closeLightbox();
            } else {
              if (currentImageIndex >= lightboxImagesList.length) {
                currentImageIndex = lightboxImagesList.length - 1;
              }
              updateLightboxContent();
            }
          }
          showToast(`🗑️ มีบางรูปภาพถูกลบออกโดยผู้ดูแลระบบ`, 'info');
        }
      } else if (data.type === 'galleryEdit') {
        // Another admin edited a photo's metadata!
        const imgIdx = galleryImages.findIndex(img => img.id === data.id);
        if (imgIdx !== -1) {
          galleryImages[imgIdx].title = data.title;
          galleryImages[imgIdx].description = data.description;
          
          // If lightbox is open and showing this image, update it
          if (document.getElementById('lightbox-modal').style.display === 'block') {
            const lbImgIdx = lightboxImagesList.findIndex(img => img.id === data.id);
            if (lbImgIdx !== -1) {
              lightboxImagesList[lbImgIdx].title = data.title;
              lightboxImagesList[lbImgIdx].description = data.description;
              updateLightboxContent();
            }
          }
          renderGalleryGrid();
          showToast(`✏️ รูปภาพ "${data.title}" ถูกแก้ไขข้อมูลโดยผู้ดูแลระบบ`, 'info');
        }
      } else {
        // Initial payload
        updateStatsUI(data.activeUsers, data.totalViews, data.totalInquiries);
        if (data.activities && data.activities.length > 0) {
          ticker.innerHTML = '';
          data.activities.forEach(act => {
            appendActivityItem(act, false);
          });
        }
      }
    };

    eventSource.onerror = (err) => {
      console.warn('SSE stats stream connection lost. Reconnecting or using simulator fallback...');
      eventSource.close();
      isConnectedSSE = false;
      startSimulationFallback();
    };

  } catch (error) {
    console.error('SSE failed initialization:', error);
    startSimulationFallback();
  }
}

function updateStatsUI(active, views, inquiries) {
  document.getElementById('nav-active-count').textContent = active;
  document.getElementById('stats-active-users').textContent = active;
  document.getElementById('stats-total-views').textContent = views.toLocaleString();
  document.getElementById('stats-total-inquiries').textContent = inquiries.toLocaleString();
}

function appendActivityItem(activity, prepend = true) {
  const ticker = document.getElementById('activity-ticker-list');
  
  const placeholder = ticker.querySelector('.placeholder-item');
  if (placeholder) {
    placeholder.remove();
  }

  const timeString = activity.time ? formatTime(activity.time) : 'เมื่อสักครู่';

  const item = document.createElement('div');
  item.className = 'ticker-item';
  if (activity.isRealLead) {
    item.classList.add('real-lead');
  }

  item.innerHTML = `
    <span class="ticker-item-text">${activity.text}</span>
    <span class="ticker-item-time">${timeString}</span>
  `;

  if (prepend) {
    ticker.insertBefore(item, ticker.firstChild);
    while (ticker.children.length > 10) {
      ticker.removeChild(ticker.lastChild);
    }
  } else {
    ticker.appendChild(item);
  }
}

function registerPageView() {
  fetch('/api/view', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  })
  .then(res => res.json())
  .then(data => {
    console.log('Page view registered. Total views:', data.totalViews);
  })
  .catch(err => {
    console.log('Unable to register page view. Running offline stats simulation.');
  });
}

function formatTime(isoString) {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

// --- 6. CLIENT-SIDE FALLBACK SIMULATION (For offline or static environments) ---
let simulationInterval = null;
let simulatedViews = 1420;
let simulatedInquiries = 12;
let simulatedActive = 4;

function startSimulationFallback() {
  if (simulationInterval) return;
  console.log("Stats dashboard simulation started.");
  
  updateStatsUI(simulatedActive, simulatedViews, simulatedInquiries);
  
  const ticker = document.getElementById('activity-ticker-list');
  ticker.innerHTML = `
    <div class="ticker-item">
      <span class="ticker-item-text">มีคนจาก ปทุมธานี กำลังคำนวณยอดผ่อนชำระบ้าน</span>
      <span class="ticker-item-time">13:25:12</span>
    </div>
    <div class="ticker-item">
      <span class="ticker-item-text">มีผู้เข้าชมจาก กรุงเทพฯ กำลังดูรูปสวนสาธารณะตรงข้ามบ้าน</span>
      <span class="ticker-item-time">13:20:05</span>
    </div>
    <div class="ticker-item">
      <span class="ticker-item-text">คุณ นิภา เพิ่งนัดหมายเข้าชมบ้านเมื่อ 20 นาทีที่แล้ว</span>
      <span class="ticker-item-time">13:05:40</span>
    </div>
  `;

  const locations = ['ปทุมธานี', 'กรุงเทพฯ', 'นนทบุรี', 'สมุทรปราการ', 'รังสิต', 'ลำลูกกา', 'สายไหม', 'ดอนเมือง', 'คูคต'];
  const actions = [
    'กำลังดูรูปภาพบ้านเดี่ยวหมู่บ้านพฤกษา 20',
    'กำลังคำนวณเงินกู้และดอกเบี้ยผ่อนชำระ',
    'กำลังเช็คเงื่อนไขโปรโมชั่นของแถมเพียบ',
    'กำลังเล็งทำเลใกล้ BTS สายสีเขียวคูคต',
    'สนใจยื่นกู้บ้านฟรีทุกธนาคารชั้นนำ',
    'เล็งบ้านทิศใต้เพื่อรับลมเย็นสบาย',
    'ดูทำเลตรงข้ามสวนสาธารณะของหมู่บ้าน'
  ];

  simulationInterval = setInterval(() => {
    if (isConnectedSSE) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      return;
    }

    const change = Math.floor(Math.random() * 3) - 1;
    simulatedActive = Math.max(2, Math.min(10, simulatedActive + change));
    simulatedViews += Math.floor(Math.random() * 2);
    
    updateStatsUI(simulatedActive, simulatedViews, simulatedInquiries);

    if (Math.random() < 0.4) {
      const randLoc = locations[Math.floor(Math.random() * locations.length)];
      const randAct = actions[Math.floor(Math.random() * actions.length)];
      const now = new Date();
      
      const activity = {
        text: `ผู้เข้าชมจาก ${randLoc} ${randAct}`,
        time: now.toISOString()
      };
      
      appendActivityItem(activity);
    }
  }, 12000);
}

// --- 7. LEAD CAPTURE FORM SUBMISSION ---
function handleFormSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('lead-name').value.trim();
  const phone = document.getElementById('lead-phone').value.trim();
  const loanOption = document.getElementById('lead-loan');
  const loanText = loanOption.options[loanOption.selectedIndex].text;
  const note = document.getElementById('lead-note').value.trim();
  
  const submitButton = document.getElementById('submit-lead-button');
  submitButton.disabled = true;
  submitButton.innerHTML = 'กำลังประมวลผล...';

  const payload = {
    name,
    phone,
    loanAmount: loanText,
    note
  };

  fetch('/api/inquiry', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })
  .then(res => {
    if (!res.ok) throw new Error('API request failed');
    return res.json();
  })
  .then(data => {
    showToast(`🎉 ลงทะเบียนสำเร็จ! ขอบคุณคุณ ${name} ที่สนใจในบริการของเรา`);
    resetForm();
  })
  .catch(err => {
    console.warn('Backend offline, running fallback submit action client-side.');
    
    simulatedInquiries++;
    updateStatsUI(simulatedActive, simulatedViews, simulatedInquiries);
    
    const cleanPhone = phone.substring(0, 3) + '-xxx-' + phone.substring(phone.length - 4);
    const activity = {
      text: `✨ คุณ ${name} (${cleanPhone}) ได้นัดชมบ้านและปรึกษาวงเงินยื่นกู้แล้ว!`,
      time: new Date().toISOString(),
      isRealLead: true
    };
    
    appendActivityItem(activity);
    showToast(`🎉 ลงทะเบียนสำเร็จ! ขอบคุณคุณ ${name} ที่สนใจชมบ้านพฤกษา 20`);
    resetForm();
  })
  .finally(() => {
    submitButton.disabled = false;
    submitButton.innerHTML = '<span>🚀</span> ลงทะเบียนนัดหมายชมบ้านฟรี';
  });
}

function resetForm() {
  document.getElementById('contactForm').reset();
}

// --- 8. TOAST NOTIFICATION UTILITY ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icon = type === 'success' ? '✅' : 'ℹ️';
  toast.innerHTML = `
    <span>${icon}</span>
    <span>${message}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => {
      toast.remove();
    }, 400);
  }, 4000);
}

// --- 9. ADMIN HIDDEN UPLOAD TRIGGER ---
function setupAdminHiddenTrigger() {
  const logos = document.querySelectorAll('.nav-logo, .footer-logo');
  let holdTimer = null;
  let isHolding = false;
  let wasLongPress = false;

  logos.forEach(logo => {
    // Disable text/image selection during hold
    logo.style.webkitUserSelect = 'none';
    logo.style.userSelect = 'none';

    const startHold = (e) => {
      // Trigger only on left click for mouse
      if (e.type === 'mousedown' && e.button !== 0) return;
      
      isHolding = true;
      wasLongPress = false;
      logo.classList.add('holding-logo');
      
      holdTimer = setTimeout(() => {
        if (isHolding) {
          wasLongPress = true;
          triggerAdminAction();
        }
        endHold();
      }, 3000); // 3 seconds
    };

    const endHold = () => {
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
      isHolding = false;
      logo.classList.remove('holding-logo');
    };

    const triggerAdminAction = () => {
      isAdminMode = !isAdminMode;
      if (isAdminMode) {
        showToast('🔓 เปิดโหมดผู้ดูแลระบบ: สามารถเพิ่ม/ลบรูปภาพได้', 'success');
        openUploadModal();
      } else {
        showToast('🔒 ปิดโหมดผู้ดูแลระบบ', 'success');
      }
      renderGalleryGrid();
    };

    // Mouse events
    logo.addEventListener('mousedown', startHold);
    logo.addEventListener('mouseup', endHold);
    logo.addEventListener('mouseleave', endHold);

    // Touch events
    logo.addEventListener('touchstart', startHold, { passive: true });
    logo.addEventListener('touchend', endHold, { passive: true });
    logo.addEventListener('touchcancel', endHold, { passive: true });

    // Handle clicks: prevent default to avoid jumps, scroll to top on short press
    logo.addEventListener('click', (e) => {
      e.preventDefault();
      if (!wasLongPress) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });
}
