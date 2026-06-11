const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for local uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'public', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const statsFilePath = path.join(__dirname, 'stats.json');
const inquiriesFilePath = path.join(__dirname, 'inquiries.json');
const galleryFilePath = path.join(__dirname, 'gallery.json');

// Memory state
let totalViews = 1420;
let totalInquiries = 12;
let activeClients = [];
let recentActivities = [
  { id: 1, text: 'มีคนจาก ปทุมธานี กำลังคำนวณยอดผ่อนชำระบ้าน', time: new Date(Date.now() - 2 * 60 * 1000).toISOString() },
  { id: 2, text: 'มีผู้เข้าชมจาก กรุงเทพฯ กำลังดูรูปสวนสาธารณะตรงข้ามบ้าน', time: new Date(Date.now() - 5 * 60 * 1000).toISOString() },
  { id: 3, text: 'คุณ นิภา เพิ่งนัดหมายเข้าชมบ้านเมื่อ 20 นาทีที่แล้ว', time: new Date(Date.now() - 20 * 60 * 1000).toISOString() }
];

// Load stats from file
function loadStats() {
  try {
    if (fs.existsSync(statsFilePath)) {
      const data = JSON.parse(fs.readFileSync(statsFilePath, 'utf8'));
      totalViews = data.totalViews || 1420;
      totalInquiries = data.totalInquiries || 12;
    }
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// Save stats to file
function saveStats() {
  try {
    fs.writeFileSync(statsFilePath, JSON.stringify({ totalViews, totalInquiries }, null, 2));
  } catch (error) {
    console.error('Error saving stats:', error);
  }
}

// Load stats on start
loadStats();

// Ensure uploads folder exists on startup
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// SSE (Server-Sent Events) Stream for real-time updates
app.get('/api/stats-stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial data immediately
  const initialPayload = {
    activeUsers: activeClients.length + 1, // Include current client
    totalViews,
    totalInquiries,
    activities: recentActivities
  };
  res.write(`data: ${JSON.stringify(initialPayload)}\n\n`);

  // Add this client to the pool
  activeClients.push(res);
  broadcastActiveCount();

  req.on('close', () => {
    activeClients = activeClients.filter(client => client !== res);
    broadcastActiveCount();
  });
});

// Broadcast updated active count to all clients
function broadcastActiveCount() {
  const payload = {
    activeUsers: Math.max(1, activeClients.length),
    totalViews,
    totalInquiries
  };
  activeClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'statsUpdate', ...payload })}\n\n`);
  });
}

// Broadcast a new activity to all clients
function broadcastActivity(activity) {
  recentActivities.unshift(activity);
  if (recentActivities.length > 20) {
    recentActivities.pop();
  }
  
  activeClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'newActivity', activity })}\n\n`);
  });
}

// API to get all gallery items
app.get('/api/gallery', (req, res) => {
  try {
    if (fs.existsSync(galleryFilePath)) {
      const data = JSON.parse(fs.readFileSync(galleryFilePath, 'utf8'));
      res.json(data);
    } else {
      res.json([]);
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to read gallery' });
  }
});

// API to upload new image to gallery (supports multiple uploads)
app.post('/api/upload', upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one file' });
    }
    const { title, description } = req.body;
    const cleanTitle = title || '';
    const cleanDesc = description || '';
    
    const newImages = [];
    req.files.forEach((file, index) => {
      let imgTitle = cleanTitle;
      if (!imgTitle) {
        const ext = path.extname(file.originalname);
        imgTitle = path.basename(file.originalname, ext);
      } else if (req.files.length > 1) {
        imgTitle = `${cleanTitle} (${index + 1})`;
      }
      
      const imagePath = `uploads/${file.filename}`;
      const newImage = {
        id: Date.now() + index,
        src: imagePath,
        title: imgTitle,
        description: cleanDesc
      };
      newImages.push(newImage);
    });
    
    let gallery = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, 'utf8'));
    }
    gallery = gallery.concat(newImages);
    fs.writeFileSync(galleryFilePath, JSON.stringify(gallery, null, 2));

    // Broadcast update for each new image
    newImages.forEach(newImage => {
      const activityText = `📸 มีผู้สนใจอัปโหลดรูปภาพใหม่: "${newImage.title}" ในแกลเลอรี`;
      const activity = {
        id: Date.now(),
        text: activityText,
        time: new Date().toISOString()
      };
      
      activeClients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'galleryUpdate', item: newImage })}\n\n`);
        client.write(`data: ${JSON.stringify({ type: 'newActivity', activity })}\n\n`);
      });
    });
    
    res.json({ success: true, items: newImages });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// API to delete gallery items (called by admin mode)
app.post('/api/gallery/delete', (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid IDs parameter' });
    }

    let gallery = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, 'utf8'));
    }

    // Filter out the deleted items and also find the files to delete physically
    const remainingGallery = [];
    const itemsToDelete = [];

    gallery.forEach(img => {
      // Compare id as number or string safely
      if (ids.map(Number).includes(Number(img.id))) {
        itemsToDelete.push(img);
      } else {
        remainingGallery.push(img);
      }
    });

    // Physically delete files from public/uploads folder if they exist
    itemsToDelete.forEach(img => {
      if (img.src && img.src.startsWith('uploads/')) {
        const filePath = path.join(__dirname, 'public', img.src);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (unlinkErr) {
          console.error(`Failed to delete file: ${filePath}`, unlinkErr);
        }
      }
    });

    fs.writeFileSync(galleryFilePath, JSON.stringify(remainingGallery, null, 2));

    // Broadcast deletion to all SSE connected clients
    activeClients.forEach(client => {
      client.write(`data: ${JSON.stringify({ type: 'galleryDelete', ids: ids.map(Number) })}\n\n`);
    });

    res.json({ success: true, deletedCount: itemsToDelete.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Delete failed' });
  }
});

// API to edit gallery item metadata (called by admin mode)
app.post('/api/gallery/edit', upload.single('imageFile'), (req, res) => {
  try {
    const { id, title, description } = req.body;
    if (!id || !title || title.trim() === '') {
      return res.status(400).json({ error: 'Invalid ID or Title parameter' });
    }

    let gallery = [];
    if (fs.existsSync(galleryFilePath)) {
      gallery = JSON.parse(fs.readFileSync(galleryFilePath, 'utf8'));
    }

    const itemIdx = gallery.findIndex(img => Number(img.id) === Number(id));
    if (itemIdx === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Save previous source to delete if we replace it
    const oldSrc = gallery[itemIdx].src;

    // Update image file if uploaded
    if (req.file) {
      const newSrc = `uploads/${req.file.filename}`;
      gallery[itemIdx].src = newSrc;

      // Clean up old physical file if it was in uploads/
      if (oldSrc && oldSrc.startsWith('uploads/')) {
        const oldFilePath = path.join(__dirname, 'public', oldSrc);
        try {
          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        } catch (unlinkErr) {
          console.error(`Failed to delete old file: ${oldFilePath}`, unlinkErr);
        }
      }
    }

    // Update metadata
    gallery[itemIdx].title = title.trim();
    gallery[itemIdx].description = description ? description.trim() : '';

    fs.writeFileSync(galleryFilePath, JSON.stringify(gallery, null, 2));

    // Broadcast edit to all SSE connected clients
    activeClients.forEach(client => {
      client.write(`data: ${JSON.stringify({ 
        type: 'galleryEdit', 
        id: Number(id), 
        title: title.trim(), 
        description: description ? description.trim() : '',
        src: gallery[itemIdx].src
      })}\n\n`);
    });

    res.json({ success: true, item: gallery[itemIdx] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Edit failed' });
  }
});

// API to increment total views (called by frontend on load)
app.post('/api/view', (req, res) => {
  totalViews++;
  saveStats();
  
  // Broadcast updated total views
  const payload = {
    activeUsers: Math.max(1, activeClients.length),
    totalViews,
    totalInquiries
  };
  activeClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'statsUpdate', ...payload })}\n\n`);
  });

  res.json({ success: true, totalViews });
});

// API to submit interest inquiry
app.post('/api/inquiry', (req, res) => {
  const { name, phone, loanAmount, note } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'ชื่อและเบอร์โทรศัพท์จำเป็นต้องระบุ' });
  }

  // Save to file
  const inquiry = {
    id: Date.now(),
    name,
    phone,
    loanAmount,
    note,
    createdAt: new Date().toISOString()
  };

  try {
    let inquiries = [];
    if (fs.existsSync(inquiriesFilePath)) {
      inquiries = JSON.parse(fs.readFileSync(inquiriesFilePath, 'utf8'));
    }
    inquiries.push(inquiry);
    fs.writeFileSync(inquiriesFilePath, JSON.stringify(inquiries, null, 2));
  } catch (error) {
    console.error('Error saving inquiry:', error);
  }

  // Update counters
  totalInquiries++;
  saveStats();

  // Create real-time notification text
  const cleanPhone = phone.length > 5 ? phone.substring(0, 3) + '-xxx-' + phone.substring(phone.length - 4) : '***';
  const activityText = `✨ คุณ ${name} (${cleanPhone}) ได้นัดชมบ้านและปรึกษาวงเงินยื่นกู้แล้ว!`;
  
  const activity = {
    id: Date.now(),
    text: activityText,
    time: new Date().toISOString(),
    isRealLead: true
  };

  broadcastActivity(activity);
  
  // Broadcast updated totals too
  const payload = {
    activeUsers: Math.max(1, activeClients.length),
    totalViews,
    totalInquiries
  };
  activeClients.forEach(client => {
    client.write(`data: ${JSON.stringify({ type: 'statsUpdate', ...payload })}\n\n`);
  });

  res.json({ success: true });
});

// Periodic simulated activities to drive urgency (FOMO)
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

setInterval(() => {
  if (activeClients.length === 0) return; // Only simulate if someone is watching
  
  // 30% chance to simulate a click/interest action
  const randLoc = locations[Math.floor(Math.random() * locations.length)];
  const randAct = actions[Math.floor(Math.random() * actions.length)];
  const activityText = `ผู้เข้าชมจาก ${randLoc} ${randAct}`;

  const activity = {
    id: Date.now(),
    text: activityText,
    time: new Date().toISOString()
  };

  broadcastActivity(activity);
}, 25000); // Send every 25 seconds

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
