const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  content: { type: String, required: true },
  sender: { type: String, required: true },
  senderRole: { type: String, default: 'Member' },
  timestamp: { type: Date, default: Date.now },
  seenBy: [{
    userId: String,
    username: String,
    timestamp: { type: Date, default: Date.now }
  }]
});

module.exports = mongoose.model('Announcement', announcementSchema);
