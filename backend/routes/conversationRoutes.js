const express = require('express');
const router = express.Router();
const ConversationController = require('../controllers/conversationController');

// Get conversations list
router.get('/', async(req, res) => {
    try {
        const { status, page } = req.query;
        const result = await ConversationController.listConversations(
            req.user.businessId, // Use businessId from user
            status || null, // Pass null instead of 'active' for all conversations
            parseInt(page) || 1
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in GET /conversations:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get conversation details
router.get('/:id', async(req, res) => {
    try {
        const conversation = await ConversationController.getConversation(
            req.params.id,
            req.user.businessId
        );
        res.json({ success: true, data: conversation });
    } catch (error) {
        console.error('Error in GET /conversations/:id:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get conversation messages
router.get('/:id/messages', async(req, res) => {
    try {
        const conversationId = req.params.id;
        const businessId = req.user.businessId;

        const messages = await ConversationController.getConversationMessages(
            conversationId,
            businessId
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error in GET /conversations/:id/messages:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get conversation messages with history
router.get('/:id/messages-with-history', async(req, res) => {
    try {
        const conversationId = req.params.id;
        const businessId = req.user.businessId;
        const includeHistory = req.query.includeHistory === 'true';

        const messages = await ConversationController.getConversationMessagesWithHistory(
            conversationId,
            businessId,
            includeHistory
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error in GET /conversations/:id/messages-with-history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get conversation history only
router.get('/:id/history', async(req, res) => {
    try {
        const conversationId = req.params.id;
        const businessId = req.user.businessId;
        const limit = parseInt(req.query.limit) || 100;
        const offset = parseInt(req.query.offset) || 0;

        const messages = await ConversationController.getConversationHistory(
            conversationId,
            businessId,
            limit,
            offset
        );

        res.json({ success: true, data: messages });
    } catch (error) {
        console.error('Error in GET /conversations/:id/history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});


// Send message in conversation
router.post('/:id/messages', async(req, res) => {
    try {
        const result = await ConversationController.sendMessage(
            req.params.id,
            req.body,
            req.user.businessId,
            req.app.get('wss') // Pass WebSocket server instance
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in POST /conversations/:id/messages:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Close conversation
router.post('/:id/close', async(req, res) => {
    try {
        const result = await ConversationController.closeConversation(
            req.params.id,
            req.user.businessId
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in POST /conversations/:id/close:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Archive conversation
router.post('/:id/archive', async(req, res) => {
    try {
        const result = await ConversationController.archiveConversation(
            req.params.id,
            req.user.businessId
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in POST /conversations/:id/archive:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Reopen conversation (unarchive/reactivate)
router.post('/:id/reopen', async(req, res) => {
    try {
        const result = await ConversationController.reopenConversation(
            req.params.id,
            req.user.businessId
        );
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('Error in POST /conversations/:id/reopen:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Manual migration trigger (for testing/admin purposes)
router.post('/migrate-history', async(req, res) => {
    try {
        const { migrateOldMessages } = require('../migrate_old_messages');
        await migrateOldMessages();
        res.json({ success: true, message: 'Chat history migration completed successfully' });
    } catch (error) {
        console.error('Error in POST /conversations/migrate-history:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Get conversation statistics
router.get('/stats/overview', async(req, res) => {
    try {
        const stats = await ConversationController.getConversationStats(
            req.user.businessId
        );
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error('Error in GET /conversations/stats/overview:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;