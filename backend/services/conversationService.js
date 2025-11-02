const axios = require('axios');
require('dotenv').config();
const { pool } = require('../config/database');
const ConversationController = require('../controllers/conversationController');
const AutoReply = require('../models/autoReplyModel');
const { v4: uuidv4 } = require('uuid');

class ConversationService {
    static async sendMessage({ to, businessId, messageType, content, mediaId, filename, caption, interactive }) {
        try {
            console.log('Sending message to:', to, 'Business ID:', businessId, 'Type:', messageType);
            // Get business settings
            const [settings] = await pool.query(
                `SELECT * FROM business_settings 
        WHERE business_id = ?`, [businessId]
            );

            if (!settings.length) {
                throw new Error('Business settings not found');
            }

            const config = {
                headers: {
                    'Authorization': `Bearer ${settings[0].whatsapp_api_token}`,
                    'Content-Type': 'application/json'
                }
            };
            

            let payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: to,
                type: messageType
            };

            // Handle different message types
            switch (messageType) {
                case 'text':
                    payload.text = {
                        body: content
                    };
                    break;

                case 'document':
                    payload.document = {
                        id: mediaId,
                        filename: filename
                    };
                    if (caption) {
                        payload.document.caption = caption;
                    }
                    break;

                case 'image':
                    payload.image = {
                        id: mediaId
                    };
                    if (caption) {
                        payload.image.caption = caption;
                    }
                    break;

                case 'video':
                    payload.video = {
                        id: mediaId
                    };
                    if (caption) {
                        payload.video.caption = caption;
                    }
                    break;

                case 'interactive':
                    payload.interactive = interactive;
                    break;

                case 'buttons':
                    // Convert buttons to interactive format for WhatsApp API
                    if (interactive && interactive.type === 'button') {
                        payload.type = 'interactive';
                        payload.interactive = interactive;
                        
                        // Log the format for debugging
                        if (interactive.action) {
                            if (interactive.action.buttons) {
                                console.log('Sending reply buttons format:', interactive.action.buttons.length, 'buttons');
                            } else if (interactive.action.phone_number) {
                                console.log('Sending CTA call button format');
                            } else if (interactive.action.url) {
                                console.log('Sending CTA URL button format');
                            }
                        }
                    } else {
                        throw new Error('Invalid buttons format');
                    }
                    break;

                case 'list':
                    // Convert list to interactive format for WhatsApp API
                    if (interactive && interactive.type === 'list') {
                        payload.type = 'interactive';
                        payload.interactive = interactive;
                    } else {
                        throw new Error('Invalid list format');
                    }
                    break;

                case 'sendMessage':
                    payload.type = 'text';
                    payload.text = {
                        body: content
                    };
                    break;

                default:
                    throw new Error(`Unsupported message type: ${messageType}`);
            }

            const response = await axios.post(
                `https://graph.facebook.com/v17.0/${settings[0].whatsapp_phone_number_id}/messages`,
                payload,
                config
            );

            return {
                success: true,
                messageId: response.data.messages[0].id
            };
        } catch (error) {
            console.error('WhatsApp API error:', error.response ? error.response.data : error.message);
            throw error;
        }
    }

    static async processIncomingMessage(entry, wss) {
        try {
            for (const item of entry) {
                let phoneNumberId;

                if (
                    item &&
                    item.changes &&
                    item.changes[0] &&
                    item.changes[0].value &&
                    item.changes[0].value.metadata &&
                    item.changes[0].value.metadata.phone_number_id
                ) {
                    phoneNumberId = item.changes[0].value.metadata.phone_number_id;
                }

                if (!phoneNumberId) continue;

                // Get business settings
                const [settings] = await pool.query(
                    'SELECT business_id FROM business_settings WHERE whatsapp_phone_number_id = ?', [phoneNumberId]
                );

                if (!settings.length) continue;
                const businessId = settings[0].business_id;

                for (const change of item.changes) {
                    if (change.value.messages) {
                        for (const message of change.value.messages) {
                            let content = '';

                            // Handle different message types for incoming messages
                            switch (message.type) {
                                case 'text':
                                    content = message.text.body;
                                    break;
                                case 'document':
                                    content = message.document.filename || 'Document';
                                    break;
                                case 'image':
                                    content = message.image.caption || 'Image';
                                    break;
                                case 'video':
                                    content = message.video.caption || 'Video';
                                    break;
                                case 'audio':
                                    content = 'Audio message';
                                    break;
                                default:
                                    content = `${message.type} message`;
                            }

                            await ConversationController.addIncomingMessage({
                                businessId,
                                phoneNumber: message.from,
                                whatsappMessageId: message.id,
                                messageType: message.type,
                                content: content,
                                timestamp: message.timestamp
                            }, wss);
                            console.log('Added incoming message:', { businessId, phoneNumber: message.from, message: content, type: message.type });
                            // Check for auto-reply after adding the message
                            if (content && message.type === 'text') {
                                console.log('Checking for auto-reply:', { businessId, phoneNumber: message.from, message: content });
                                await this.checkAndSendAutoReply({
                                    businessId,
                                    phoneNumber: message.from,
                                    message: content,
                                    wss
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            //error
            console.error('Error processing incoming message:', error);
            throw error;
        }
    }

    // Check for auto-reply and send if match found
    static async checkAndSendAutoReply({ businessId, phoneNumber, message, wss }) {
        try {
            console.log('Checking for auto-reply:', { businessId, phoneNumber, message });

            // Find matching auto-reply
            const autoReply = await AutoReply.findMatchingReply(businessId, message);

            if (autoReply) {
                console.log('Auto-reply match found:', autoReply.keyword, '->', autoReply.response_message);

                // Send the auto-reply message
                await this.sendMessage({
                    to: phoneNumber,
                    businessId: businessId,
                    messageType: 'text',
                    content: autoReply.response_message
                });

                // Add the auto-reply message to the conversation
                await this.addOutgoingMessage({
                    businessId,
                    phoneNumber,
                    messageType: 'text',
                    content: autoReply.response_message,
                    isAutoReply: true,
                    autoReplyId: autoReply.id
                }, wss);

                console.log('Auto-reply sent successfully');
            } else {
                console.log('No auto-reply match found for message:', message);
            }
        } catch (error) {
            console.error('Error checking/sending auto-reply:', error);
            // Don't throw error to avoid breaking the main message processing
        }
    }
    static async addOutgoingMessage(messageData, wss) {
        console.log('Adding outgoing message:', messageData);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                businessId,
                phoneNumber,
                messageType,
                content,
                isAutoReply = false,
                autoReplyId = null
            } = messageData;

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(businessId, phoneNumber);

            // Insert message
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages 
                (id, conversation_id, direction, message_type, content, status, timestamp, is_auto_reply, auto_reply_id) 
                VALUES (?, ?, 'outbound', ?, ?, 'sent', NOW(), ?, ?)`, [
                    messageId,
                    conversation.id,
                    messageType,
                    content,
                    isAutoReply,
                    autoReplyId
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations 
                SET last_message_at = NOW()
                WHERE id = ?`, [conversation.id]
            );

            await connection.commit();

            // Get full message for real-time update
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            // WebSocket notification
            if (wss && typeof wss.notifyNewMessage === 'function') {
                try {
                    wss.notifyNewMessage(businessId, conversation.id, message[0]);
                } catch (wsError) {
                    console.error("Error calling WebSocket notification:", wsError);
                }
            }

            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Check for auto-reply and send if match found
    static async checkAndSendAutoReply({ businessId, phoneNumber, message, wss }) {
        try {
            console.log('Checking for auto-reply:', { businessId, phoneNumber, message });

            // Find matching auto-reply
            const autoReply = await AutoReply.findMatchingReply(businessId, message);

            if (autoReply) {
                console.log('Auto-reply match found:', autoReply.keyword, '->', autoReply.response_message);

                // Send the auto-reply message
                await this.sendMessage({
                    to: phoneNumber,
                    businessId: businessId,
                    messageType: 'text',
                    content: autoReply.response_message
                });

                // Add the auto-reply message to the conversation
                await this.addOutgoingMessage({
                    businessId,
                    phoneNumber,
                    messageType: 'text',
                    content: autoReply.response_message,
                    isAutoReply: true,
                    autoReplyId: autoReply.id
                }, wss);

                console.log('Auto-reply sent successfully');
            } else {
                console.log('No auto-reply match found for message:', message);
            }
        } catch (error) {
            console.error('Error checking/sending auto-reply:', error);
            // Don't throw error to avoid breaking the main message processing
        }
    }

    static async addOutgoingMessage(messageData, wss) {
        console.log('Adding outgoing message:', messageData);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                businessId,
                phoneNumber,
                messageType,
                content,
                isAutoReply = false,
                autoReplyId = null
            } = messageData;

            // Get or create conversation
            const conversation = await ConversationController.getOrCreateConversation(businessId, phoneNumber);

            // Insert message
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages
                (id, conversation_id, direction, message_type, content, status, timestamp, is_auto_reply, auto_reply_id)
                VALUES (?, ?, 'outbound', ?, ?, 'sent', NOW(), ?, ?)`, [
                    messageId,
                    conversation.id,
                    messageType,
                    content,
                    isAutoReply,
                    autoReplyId
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations
                SET last_message_at = NOW()
                WHERE id = ?`, [conversation.id]
            );

            await connection.commit();

            // Get full message for real-time update
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            // WebSocket notification
            if (wss && typeof wss.notifyNewMessage === 'function') {
                try {
                    wss.notifyNewMessage(businessId, conversation.id, message[0]);
                } catch (wsError) {
                    console.error("Error calling WebSocket notification:", wsError);
                }
            }

            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async addMessageToConversation(messageData) {
        console.log('Adding message to conversation:', messageData);
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                conversationId,
                direction,
                messageType,
                content,
                mediaUrl = null,
                mediaFilename = null,
                isBot = false,
                isCampaign = false,
                campaignId = null,
                isAutoReply = false,
                autoReplyId = null,
                interactive = null,
                whatsappMessageId = null,
                flowId = null // Add flow_id support
            } = messageData;

            // Insert message
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages
                (id, conversation_id, whatsapp_message_id, direction, message_type, content, media_url, media_filename, status, timestamp, is_bot, is_campaign, campaign_id, is_auto_reply, auto_reply_id, interactive_data, flow_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'sent', NOW(), ?, ?, ?, ?, ?, ?, ?)`, [
                    messageId,
                    conversationId,
                    whatsappMessageId,
                    direction,
                    messageType,
                    content,
                    mediaUrl,
                    mediaFilename,
                    isBot,
                    isCampaign,
                    campaignId,
                    isAutoReply,
                    autoReplyId,
                    interactive ? JSON.stringify(interactive) : null,
                    flowId
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations
                SET last_message_at = NOW()
                WHERE id = ?`, [conversationId]
            );

            await connection.commit();

            // Get full message for response
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            return message[0];
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ConversationService;