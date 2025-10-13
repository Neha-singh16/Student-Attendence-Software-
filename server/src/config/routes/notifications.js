const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { userAuth } = require('../middleware/userAuth');

// Placeholder for Notification model - create this if it doesn't exist
let Notification;
try {
  Notification = require('../models/notification');
} catch (err) {
  // If notification model doesn't exist, create a simple placeholder
  const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['info', 'success', 'warning', 'error'], default: 'info' },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    actionUrl: { type: String, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }, { timestamps: true });
  
  Notification = mongoose.model('Notification', NotificationSchema);
}

// GET /notifications - Get user notifications
router.get('/', userAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const userId = req.user._id;
    
    const filter = { userId };
    if (unreadOnly === 'true') {
      filter.read = false;
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ userId, read: false });
    
    res.json({
      notifications,
      total,
      unreadCount,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    console.error('GET /notifications error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// POST /notifications - Create notification (admin/system)
router.post('/', userAuth, async (req, res) => {
  try {
    const { userId, title, message, type = 'info', actionUrl } = req.body;
    
    if (!userId || !title || !message) {
      return res.status(400).json({ error: 'userId, title, and message are required' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'invalid userId' });
    }
    
    const notification = new Notification({
      userId: mongoose.Types.ObjectId(userId),
      title: title.trim(),
      message: message.trim(),
      type,
      actionUrl: actionUrl || null,
      createdBy: req.user._id
    });
    
    await notification.save();
    
    res.status(201).json(notification);
  } catch (err) {
    console.error('POST /notifications error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// PUT /notifications/:id/read - Mark notification as read
router.put('/:id/read', userAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, userId: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'notification not found' });
    }
    
    res.json({ ok: true, notification });
  } catch (err) {
    console.error('PUT /notifications/:id/read error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// PUT /notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', userAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ ok: true, updatedCount: result.modifiedCount });
  } catch (err) {
    console.error('PUT /notifications/mark-all-read error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// DELETE /notifications/:id - Delete notification
router.delete('/:id', userAuth, async (req, res) => {
  try {
    const notificationId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ error: 'invalid id' });
    }
    
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      userId: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'notification not found' });
    }
    
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /notifications/:id error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

module.exports = router;
