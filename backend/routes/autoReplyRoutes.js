const express = require('express');
const router = express.Router();
const AutoReplyController = require('../controllers/autoReplyController');


// Create a new auto-reply
router.post('/', AutoReplyController.createAutoReply);

// Get all auto-replies for the business
router.get('/', AutoReplyController.getAutoReplies);

// Get auto-reply statistics
router.get('/stats', AutoReplyController.getAutoReplyStats);

// Test auto-reply matching
router.post('/test', AutoReplyController.testAutoReply);

// Get a specific auto-reply
router.get('/:id', AutoReplyController.getAutoReply);

// Update an auto-reply
router.put('/:id', AutoReplyController.updateAutoReply);

// Toggle auto-reply active status
router.patch('/:id/toggle', AutoReplyController.toggleAutoReply);

// Delete an auto-reply
router.delete('/:id', AutoReplyController.deleteAutoReply);

module.exports = router;