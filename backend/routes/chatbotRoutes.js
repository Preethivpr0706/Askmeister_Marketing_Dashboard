const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');
const multer = require('multer');

// Configure multer for memory storage (needed for FormData)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Conversation routes
router.get('/conversations/:conversationId/status', chatbotController.getChatbotStatus);
router.post('/conversations/:conversationId/toggle', chatbotController.toggleChatbotForConversation);
router.post('/conversations/:conversationId/process', chatbotController.processChatbotMessage);

// Flow routes
router.post('/flows',chatbotController.createFlow);
router.get('/flows', chatbotController.getFlows);
router.get('/flows/:flowId',chatbotController.getFlowById);
router.put('/flows/:flowId', chatbotController.updateFlow);
router.delete('/flows/:flowId',chatbotController.deleteFlow);
router.get('/flows/:flowId/complete', chatbotController.getCompleteFlow);

// Node routes
router.post('/flows/:flowId/nodes',  chatbotController.createNode);
router.put('/flows/:flowId/nodes/:nodeId',  chatbotController.updateNode);
router.delete('/flows/:flowId/nodes/:nodeId', chatbotController.deleteNode);

// Edge routes
router.post('/flows/:flowId/edges',  chatbotController.createEdge);
router.put('/flows/:flowId/edges/:edgeId',  chatbotController.updateEdge);
router.delete('/flows/:flowId/edges/:edgeId',  chatbotController.deleteEdge);

// Media upload route
router.post('/upload-media', upload.single('file'), chatbotController.uploadMedia);

// Test route
router.post('/flows/:flowId/test', chatbotController.testFlow);

module.exports = router;