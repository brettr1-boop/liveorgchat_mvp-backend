require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const Announcement = require('./models/Announcement');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Connect DB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.log(err));

// Hardcoded group & users for MVP
const GROUP_ID = "org-1";
const USERS = {
  "admin1": { id: "admin1", name: "Sarah (Admin)", role: "admin" },
  "user1": { id: "user1", name: "John Doe", role: "member" },
  "user2": { id: "user2", name: "Jane Smith", role: "member" },
  "user3": { id: "user3", name: "Mike Chen", role: "member" }
};

// API: Get all announcements
app.get('/api/announcements', async (req, res) => {
  const announcements = await Announcement.find({ groupId: GROUP_ID }).sort({ timestamp: -1 });
  res.json(announcements);
});

// API: Post announcement (admin only)
app.post('/api/announcements', async (req, res) => {
  const { content, userId } = req.body;
  const user = USERS[userId];
  if (!user || user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

  const ann = new Announcement({
    groupId: GROUP_ID,
    content,
    sender: user.name,
    senderRole: user.role
  });
  await ann.save();
  io.to(GROUP_ID).emit('newAnnouncement', ann);
  res.json(ann);
});

// Socket.io
io.on('connection', (socket) => {
  const user = socket.handshake.auth.user;
  if (!user || !USERS[user.id]) {
    socket.disconnect();
    return;
  }

  socket.join(GROUP_ID);
  console.log(`${user.name} connected`);

  socket.on('markSeen', async ({ annId }) => {
    const ann = await Announcement.findById(annId);
    if (!ann.seenBy.some(s => s.userId === user.id)) {
      ann.seenBy.push({ userId: user.id, username: user.name });
      await ann.save();
      io.to(GROUP_ID).emit('seenUpdate', { annId, seenBy: ann.seenBy });
    }
  });

  socket.on('disconnect', () => {
    console.log(`${user.name} disconnected`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
