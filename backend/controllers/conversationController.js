const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const ConversationService = require('../services/conversationService');
const { normalizePhoneNumber, comparePhoneNumbers } = require('../utils/phoneUtils');

class ConversationController {
    static async getOrCreateConversation(businessId, phoneNumber, contactName = null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Normalize phone number for consistent matching
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            if (!normalizedPhone) {
                throw new Error('Invalid phone number');
            }

            // Check if conversation exists - compare normalized numbers
            const [allConversations] = await connection.query(
                `SELECT * FROM conversations
                WHERE business_id = ? AND status = 'active'
                ORDER BY last_message_at DESC`, [businessId]
            );

            // Find conversation with matching normalized phone number
            const existing = allConversations.find(conv => 
                comparePhoneNumbers(conv.phone_number, normalizedPhone)
            );

            if (existing) {
                await connection.commit();
                return existing;
            }

            // Check if contact exists - compare normalized numbers
            const [allContacts] = await connection.query(
                `SELECT id, wanumber FROM contacts
                WHERE business_id = ?`, [businessId]
            );

            // Find contact with matching normalized phone number
            const contact = allContacts.find(c => 
                comparePhoneNumbers(c.wanumber, normalizedPhone)
            );

            // Declare contactId variable
            let contactId = null;

            if (!contact && contactName) {
                // Contact doesn't exist, create it in "unknown" list
                console.log(`Creating contact for unknown number: ${normalizedPhone} with name: ${contactName}`);

                // Get or create "unknown" contact list
                let unknownListId = null;
                const [unknownList] = await connection.query(
                    `SELECT id FROM contact_lists
                    WHERE user_id = (SELECT id FROM users WHERE business_id = ? LIMIT 1)
                    AND name = 'unknown'
                    LIMIT 1`, [businessId]
                );
                console.log('Unknown list query result:', unknownList);

                if (unknownList.length === 0) {
                    // Create "unknown" list
                    console.log('Creating unknown list for business:', businessId);
                    const userIdQuery = await connection.query(
                        `SELECT id FROM users WHERE business_id = ?`, [businessId]
                    );
                    console.log('User ID query result:', userIdQuery);

                    if (userIdQuery[0] && userIdQuery[0].length > 0) {
                        const userId = userIdQuery[0][0].id;
                        console.log('Found user ID:', userId);

                        await connection.query(
                            `INSERT INTO contact_lists (name, user_id) VALUES ('unknown', ?)`, [userId]
                        );

                        const [newList] = await connection.query(
                            `SELECT id FROM contact_lists
                            WHERE user_id = ? AND name = 'unknown'
                            ORDER BY created_at DESC LIMIT 1`, [userId]
                        );
                        unknownListId = newList[0].id;
                        console.log('Created unknown list with ID:', unknownListId);
                    } else {
                        console.log('No user_id found in users table for business:', businessId);
                        await connection.commit();
                        return null;
                    }
                } else {
                    unknownListId = unknownList[0].id;
                }

                // Create contact in "unknown" list with normalized phone number
                await connection.query(
                    `INSERT INTO contacts (fname, lname, wanumber, list_id, business_id)
                    VALUES (?, '', ?, ?, ?)`,
                    [contactName, normalizedPhone, unknownListId, businessId]
                );

                const [newContact] = await connection.query(
                    `SELECT id FROM contacts
                    WHERE business_id = ? AND wanumber = ?
                    ORDER BY created_at DESC LIMIT 1`, [businessId, normalizedPhone]
                );
                contactId = newContact[0].id;
                console.log(`Successfully created contact: ${contactName} (${normalizedPhone}) in unknown list`);
            } else if (contact) {
                contactId = contact.id;
            }

            // If no contact exists and no contactName provided, contactId will be null
            // This is acceptable - conversation can exist without a contact_id

            // Create new conversation with normalized phone number
            const conversationId = uuidv4();
            await connection.query(
                `INSERT INTO conversations
                (id, business_id, phone_number, contact_id, status)
                VALUES (?, ?, ?, ?, 'active')`, [
                    conversationId,
                    businessId,
                    normalizedPhone,
                    contactId
                ]
            );

            await connection.commit();
            return {
                id: conversationId,
                business_id: businessId,
                phone_number: normalizedPhone,
                contact_id: contactId,
                status: 'active'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async addIncomingMessage(messageData, wss) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            const {
                businessId,
                phoneNumber,
                whatsappMessageId,
                messageType,
                content,
                mediaUrl,
                mediaFilename,
                fileSize,
                timestamp,
                interactive,
                contactName,
                flowId = null
            } = messageData;

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(businessId, phoneNumber, contactName);

            // Insert message
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages 
                (id, conversation_id, whatsapp_message_id, direction, 
                message_type, content, media_url, media_filename, file_size, status, timestamp, is_auto_reply, auto_reply_id, interactive_data, flow_id) 
                VALUES (?, ?, ?, 'inbound', ?, ?, ?, ?, ?, 'delivered', ?, FALSE, NULL, ?, ?)`, [
                    messageId,
                    conversation.id,
                    whatsappMessageId,
                    messageType,
                    content,
                    mediaUrl,
                    mediaFilename,
                    fileSize,
                    new Date(timestamp * 1000),
                    interactive ? JSON.stringify(interactive) : null,
                    flowId
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations 
                SET last_message_at = ?, 
                    unread_count = unread_count + 1,
                    whatsapp_message_id = ?
                WHERE id = ?`, [new Date(timestamp * 1000), whatsappMessageId, conversation.id]
            );

            await connection.commit();

            // Get full message for real-time update
            const [message] = await pool.query(
                `SELECT * FROM chat_messages WHERE id = ?`, [messageId]
            );

            // Improved WebSocket notification with better error handling
            if (wss) {
                console.log("WebSocket server instance:", typeof wss);
                console.log("Available methods:", Object.getOwnPropertyNames(wss).filter(name => typeof wss[name] === 'function'));

                try {
                    // Check if it's the WSServer instance with notifyNewMessage method
                    if (typeof wss.notifyNewMessage === 'function') {
                        console.log("Calling notifyNewMessage with:", { businessId, conversationId: conversation.id });
                        wss.notifyNewMessage(businessId, conversation.id, message[0]);
                    } else {
                        console.warn("notifyNewMessage method not found on WebSocket server");
                        console.warn("Available methods:", Object.getOwnPropertyNames(wss));
                    }
                } catch (wsError) {
                    console.error("Error calling WebSocket notification:", wsError);
                }
            } else {
                console.warn("No WebSocket server instance provided");
            }

            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
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
                autoReplyId = null,
                flowId = null,
                campaignId = null
            } = messageData;

            // Get or create conversation
            const conversation = await this.getOrCreateConversation(businessId, phoneNumber);

            // Insert message
            const messageId = uuidv4();
            console.log('Inserting message with flowId:', flowId, 'campaignId:', campaignId);
            await connection.query(
                `INSERT INTO chat_messages
                (id, conversation_id, direction, message_type, content, status, timestamp, is_auto_reply, auto_reply_id, flow_id, campaign_id)
                VALUES (?, ?, 'outbound', ?, ?, 'sent', NOW(), ?, ?, ?, ?)`, [
                    messageId,
                    conversation.id,
                    messageType,
                    content,
                    isAutoReply,
                    autoReplyId,
                    flowId,
                    campaignId
                ]
            );

            // Update conversation
            await connection.query(
                `UPDATE conversations
                SET last_message_at = NOW()
                WHERE id = ?`, [conversation.id]
            );

            await connection.commit();

            console.log('✅ Outgoing message stored with ID:', messageId, 'flowId:', flowId);

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
            } else {
                console.log('⚠️ No WebSocket notification for test message (wss is null or missing method)');
            }

            return messageId;
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    static async listConversations(businessId, status = null, page = 1, limit = 20) {
        console.log("list called");
        const connection = await pool.getConnection();
        try {
            let baseQuery = `
        SELECT 
            c.*,
            CONCAT(COALESCE(co.fname, ''), ' ', COALESCE(co.lname, '')) as contact_name,
            (SELECT COUNT(*) FROM chat_messages 
             WHERE conversation_id = c.id AND direction = 'inbound' AND read_at IS NULL) as unread_count
        FROM conversations c
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.business_id = ?
    `;

            const params = [businessId];

            if (status && status !== 'all' && status !== 'unread') {
                // Specific conversation status filter (active/closed/archived)
                baseQuery += ` AND c.status = ?`;
                params.push(status);
            } else if (!status || status === 'all') {
                // All chats excludes archived by default
                baseQuery += ` AND c.status IN ('active', 'closed')`;
            }

            // Handle unread filter: conversations with unread inbound messages
            if (status === 'unread') {
                // Exclude archived by default for unread view, match WhatsApp behavior
                baseQuery += ` AND c.status IN ('active', 'closed')`;
                // Use scalar subquery in WHERE for reliability across MySQL modes
                baseQuery += ` AND (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND direction = 'inbound' AND read_at IS NULL) > 0`;
            }

            const limitInt = parseInt(limit, 10);
            const pageInt = parseInt(page, 10);
            const offsetInt = (pageInt - 1) * limitInt;

            baseQuery += ` ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?`;
            params.push(limitInt, offsetInt);

            const [conversations] = await connection.query(baseQuery, params);

            // Get all campaign messages for this business in one query
            // Also get conversation phone numbers to match
            const [allCampaignMessages] = await connection.query(
                `SELECT t.body_text, m.timestamp, ct.wanumber, ct.wanumber as contact_phone
                 FROM messages m
                 JOIN campaigns camp ON m.campaign_id = camp.id
                 JOIN contacts ct ON m.contact_id = ct.id
                 JOIN templates t ON camp.template_id = t.id
                 WHERE camp.business_id = ?
                 ORDER BY m.timestamp DESC`,
                [businessId]
            );

            // Normalize all campaign message phone numbers for matching
            const normalizedCampaignMessages = allCampaignMessages.map(msg => ({
                ...msg,
                normalizedPhone: normalizePhoneNumber(msg.wanumber)
            }));

            // Get all last chat messages in one query
            const conversationIds = conversations.map(c => c.id);
            let lastChatMessages = [];
            if (conversationIds.length > 0) {
                const placeholders = conversationIds.map(() => '?').join(',');
                const [chatMsgs] = await connection.query(
                    `SELECT conversation_id, content, timestamp 
                     FROM chat_messages 
                     WHERE conversation_id IN (${placeholders})
                     AND (conversation_id, timestamp) IN (
                         SELECT conversation_id, MAX(timestamp) 
                         FROM chat_messages 
                         WHERE conversation_id IN (${placeholders})
                         GROUP BY conversation_id
                     )`,
                    [...conversationIds, ...conversationIds]
                );
                lastChatMessages = chatMsgs;
            }

            // Create a map of conversation_id -> last chat message
            const chatMessageMap = new Map();
            lastChatMessages.forEach(msg => {
                chatMessageMap.set(msg.conversation_id, msg);
            });

            // Process each conversation
            const updatePromises = [];
            for (const conv of conversations) {
                const normalizedPhone = normalizePhoneNumber(conv.phone_number);
                
                // Get last chat message for this conversation
                const lastChatMsg = chatMessageMap.get(conv.id);
                
                // Find matching campaign messages for this phone number
                // Try both normalized comparison and direct comparison (for backward compatibility)
                const matchingCampaignMessages = normalizedCampaignMessages.filter(msg => {
                    const msgNormalized = msg.normalizedPhone;
                    // Match if normalized numbers are equal, or if original numbers match (fallback)
                    return (msgNormalized && normalizedPhone && msgNormalized === normalizedPhone) ||
                           msg.wanumber === conv.phone_number;
                });

                // Determine the last message
                let lastMessageContent = null;
                let lastMessageTime = null;

                if (lastChatMsg) {
                    lastMessageContent = lastChatMsg.content;
                    lastMessageTime = new Date(lastChatMsg.timestamp);
                }

                if (matchingCampaignMessages.length > 0) {
                    const campaignMsg = matchingCampaignMessages[0];
                    const campaignTime = new Date(campaignMsg.timestamp);
                    
                    // Use campaign message if it's more recent or if there's no chat message
                    if (!lastMessageTime || campaignTime > lastMessageTime) {
                        lastMessageContent = campaignMsg.body_text;
                        lastMessageTime = campaignTime;
                        
                        // Update conversation's last_message_at if campaign message is more recent
                        if (campaignTime > new Date(conv.last_message_at || 0)) {
                            updatePromises.push(
                                connection.query(
                                    `UPDATE conversations 
                                     SET last_message_at = ? 
                                     WHERE id = ?`,
                                    [campaignMsg.timestamp, conv.id]
                                )
                            );
                            conv.last_message_at = campaignMsg.timestamp;
                        }
                    }
                }

                conv.last_message_content = lastMessageContent;
            }

            // Execute all updates in parallel
            if (updatePromises.length > 0) {
                await Promise.all(updatePromises);
            }

            return conversations;
        } catch (error) {
            console.error('Error in listConversations:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getConversation(conversationId, businessId) {
        try {
            const [conversation] = await pool.execute(
                `SELECT 
                    c.*,
                    CONCAT(COALESCE(co.fname, ''), ' ', COALESCE(co.lname, '')) as contact_name
                FROM conversations c
                LEFT JOIN contacts co ON c.contact_id = co.id
                WHERE c.id = ? AND c.business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            return conversation[0];
        } catch (error) {
            console.error('Error in getConversation:', error);
            throw error;
        }
    }

    static async getConversationMessages(conversationId, businessId) {
        const connection = await pool.getConnection();
        try {
            // Get conversation details to find the phone number
            const [conversation] = await connection.query(
                `SELECT phone_number FROM conversations
             WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or unauthorized');
            }

            const phoneNumber = conversation[0].phone_number;
            const normalizedPhone = normalizePhoneNumber(phoneNumber);

            // Get all chat messages (including campaign messages stored in chat_messages)
            const [chatMessages] = await connection.query(
                `SELECT * FROM chat_messages
             WHERE conversation_id = ?
             ORDER BY timestamp ASC`, [conversationId]
            );

            // Identify campaign messages from chat_messages (those with campaign_id or message_type='template')
            const campaignMessageIds = new Set();
            const campaignMessagesFromChat = chatMessages.filter(msg => {
                const isCampaign = msg.campaign_id || (msg.message_type === 'template' && msg.direction === 'outbound');
                if (isCampaign && msg.campaign_id) {
                    campaignMessageIds.add(msg.campaign_id);
                }
                return isCampaign;
            });

            // Get template info for campaign messages that need enrichment
            const campaignIds = [...new Set(campaignMessagesFromChat
                .map(msg => msg.campaign_id)
                .filter(id => id))];

            let campaignTemplateMap = {};
            let templateButtonsMap = {};

            if (campaignIds.length > 0) {
                // Get campaign and template info
                const [campaignTemplates] = await connection.query(
                    `SELECT
                    c.id as campaign_id,
                    c.name as campaign_name,
                    t.id as template_id,
                    t.header_type,
                    t.header_content,
                    t.body_text,
                    t.footer_text,
                    t.variables
                 FROM campaigns c
                 JOIN templates t ON c.template_id = t.id
                 WHERE c.id IN (?)
                 AND c.business_id = ?`, [campaignIds, businessId]
                );

                // Create map of campaign_id -> template info
                campaignTemplateMap = campaignTemplates.reduce((acc, ct) => {
                    acc[ct.campaign_id] = {
                        campaign_name: ct.campaign_name,
                        template_id: ct.template_id,
                        header_type: ct.header_type,
                        header_content: ct.header_content,
                        body_text: ct.body_text,
                        footer_text: ct.footer_text,
                        variables: ct.variables ? JSON.parse(ct.variables) : {}
                    };
                    return acc;
                }, {});

                // Get buttons for templates
                const templateIds = campaignTemplates.map(ct => ct.template_id);
                if (templateIds.length > 0) {
                    const [buttons] = await connection.query(
                        `SELECT template_id, type, text, value, button_order
                     FROM template_buttons
                     WHERE template_id IN (?)
                     ORDER BY template_id, button_order`, [templateIds]
                    );

                    // Group buttons by template_id
                    templateButtonsMap = buttons.reduce((acc, button) => {
                        if (!acc[button.template_id]) {
                            acc[button.template_id] = [];
                        }
                        acc[button.template_id].push({
                            type: button.type,
                            text: button.text,
                            value: button.value,
                            button_order: button.button_order
                        });
                        return acc;
                    }, {});
                }
            }

            // Enrich campaign messages from chat_messages with template info
            // Use the actual content from chat_messages (which has replaced variables)
            const enrichedChatMessages = chatMessages.map(msg => {
                // If this is a campaign message, enrich it with template info
                if (msg.campaign_id && campaignTemplateMap[msg.campaign_id]) {
                    const templateInfo = campaignTemplateMap[msg.campaign_id];
                    const templateId = templateInfo.template_id;
                    
                    return {
                        ...msg,
                        campaign_name: templateInfo.campaign_name,
                        // Use content from chat_messages (actual sent message with replaced variables)
                        // Don't override content - it already has the actual values
                        template: {
                            header_type: templateInfo.header_type,
                            header_content: templateInfo.header_content,
                            body_text: templateInfo.body_text, // Keep original for reference, but content field has actual values
                            footer_text: templateInfo.footer_text,
                            buttons: templateButtonsMap[templateId] || [],
                            variables: templateInfo.variables
                        }
                    };
                }
                return msg;
            });

            // Get campaign messages from messages table that are NOT in chat_messages
            // (for backward compatibility with old campaign messages)
            const [allCampaignMessages] = await connection.query(
                `SELECT
                m.id,
                m.status,
                m.timestamp,
                m.error,
                c.id as campaign_id,
                c.name as campaign_name,
                t.header_type,
                t.header_content,
                t.body_text,
                t.footer_text,
                t.id as template_id,
                t.variables,
                ct.wanumber
             FROM messages m
             JOIN campaigns c ON m.campaign_id = c.id
             JOIN contacts ct ON m.contact_id = ct.id
             JOIN templates t ON c.template_id = t.id
             WHERE c.business_id = ?
             ORDER BY m.timestamp ASC`, [businessId]
            );

            // Filter campaign messages by normalized phone number
            const campaignMessages = allCampaignMessages.filter(msg => 
                comparePhoneNumbers(msg.wanumber, normalizedPhone)
            );

            // Get buttons for legacy campaign messages
            const legacyTemplateIds = campaignMessages.map(msg => msg.template_id);
            let legacyTemplateButtons = [];

            if (legacyTemplateIds.length > 0) {
                const [buttons] = await connection.query(
                    `SELECT template_id, type, text, value, button_order
                 FROM template_buttons
                 WHERE template_id IN (?)
                 ORDER BY template_id, button_order`, [legacyTemplateIds]
                );
                legacyTemplateButtons = buttons;
            }

            // Group buttons by template_id
            const legacyButtonsByTemplate = legacyTemplateButtons.reduce((acc, button) => {
                if (!acc[button.template_id]) {
                    acc[button.template_id] = [];
                }
                acc[button.template_id].push({
                    type: button.type,
                    text: button.text,
                    value: button.value,
                    button_order: button.button_order
                });
                return acc;
            }, {});

            // Create a set of timestamps from chat_messages to avoid duplicates
            const chatMessageTimestamps = new Set(
                enrichedChatMessages.map(msg => new Date(msg.timestamp).getTime())
            );

            // Format legacy campaign messages (only if not already in chat_messages)
            const formattedCampaignMessages = campaignMessages
                .filter(msg => {
                    // Only include if not already in chat_messages (check by timestamp)
                    const msgTimestamp = new Date(msg.timestamp).getTime();
                    return !chatMessageTimestamps.has(msgTimestamp);
                })
                .map(msg => ({
                    id: msg.id,
                    conversation_id: conversationId,
                    direction: 'outbound',
                    message_type: 'template',
                    status: msg.status,
                    timestamp: msg.timestamp,
                    campaign_id: msg.campaign_id,
                    campaign_name: msg.campaign_name,
                    template: {
                        header_type: msg.header_type,
                        header_content: msg.header_content,
                        body_text: msg.body_text,
                        footer_text: msg.footer_text,
                        buttons: legacyButtonsByTemplate[msg.template_id] || [],
                        variables: msg.variables ? JSON.parse(msg.variables) : {}
                    },
                    error: msg.error
                }));

            // Combine and sort all messages by timestamp
            const allMessages = [...enrichedChatMessages, ...formattedCampaignMessages].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            // Mark messages as read
            await connection.query(
                `UPDATE chat_messages
             SET read_at = NOW()
             WHERE conversation_id = ? AND direction = 'inbound' AND read_at IS NULL`, [conversationId]
            );

            // Update conversation unread count
            await connection.query(
                `UPDATE conversations
             SET unread_count = 0
             WHERE id = ?`, [conversationId]
            );

            return allMessages;
        } finally {
            connection.release();
        }
    }

    static async getConversationMessagesWithHistory(conversationId, businessId, includeHistory = false) {
        const connection = await pool.getConnection();
        try {
            // Get conversation details to find the phone number
            const [conversation] = await connection.query(
                `SELECT phone_number FROM conversations
             WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or unauthorized');
            }

            const phoneNumber = conversation[0].phone_number;
            const normalizedPhone = normalizePhoneNumber(phoneNumber);

            // Get live chat messages
            const [chatMessages] = await connection.query(
                `SELECT * FROM chat_messages
             WHERE conversation_id = ?
             ORDER BY timestamp ASC`, [conversationId]
            );

            let allMessages = [...chatMessages];

            // If history is requested, also get historical messages
            if (includeHistory) {
                const [historyMessages] = await connection.query(
                    `SELECT * FROM chat_messages_history
                 WHERE conversation_id = ?
                 ORDER BY timestamp ASC`, [conversationId]
                );
                allMessages = [...allMessages, ...historyMessages];
            }

            // Identify campaign messages from chat_messages and history
            const campaignIds = [...new Set(allMessages
                .filter(msg => msg.campaign_id || (msg.message_type === 'template' && msg.direction === 'outbound'))
                .map(msg => msg.campaign_id)
                .filter(id => id))];

            let campaignTemplateMap = {};
            let templateButtonsMap = {};

            if (campaignIds.length > 0) {
                // Get campaign and template info
                const [campaignTemplates] = await connection.query(
                    `SELECT
                    c.id as campaign_id,
                    c.name as campaign_name,
                    t.id as template_id,
                    t.header_type,
                    t.header_content,
                    t.body_text,
                    t.footer_text,
                    t.variables
                 FROM campaigns c
                 JOIN templates t ON c.template_id = t.id
                 WHERE c.id IN (?)
                 AND c.business_id = ?`, [campaignIds, businessId]
                );

                // Create map of campaign_id -> template info
                campaignTemplateMap = campaignTemplates.reduce((acc, ct) => {
                    acc[ct.campaign_id] = {
                        campaign_name: ct.campaign_name,
                        template_id: ct.template_id,
                        header_type: ct.header_type,
                        header_content: ct.header_content,
                        body_text: ct.body_text,
                        footer_text: ct.footer_text,
                        variables: ct.variables ? JSON.parse(ct.variables) : {}
                    };
                    return acc;
                }, {});

                // Get buttons for templates
                const templateIds = campaignTemplates.map(ct => ct.template_id);
                if (templateIds.length > 0) {
                    const [buttons] = await connection.query(
                        `SELECT template_id, type, text, value, button_order
                     FROM template_buttons
                     WHERE template_id IN (?)
                     ORDER BY template_id, button_order`, [templateIds]
                    );

                    // Group buttons by template_id
                    templateButtonsMap = buttons.reduce((acc, button) => {
                        if (!acc[button.template_id]) {
                            acc[button.template_id] = [];
                        }
                        acc[button.template_id].push({
                            type: button.type,
                            text: button.text,
                            value: button.value,
                            button_order: button.button_order
                        });
                        return acc;
                    }, {});
                }
            }

            // Enrich campaign messages with template info
            // Use the actual content from chat_messages (which has replaced variables)
            const enrichedChatMessages = allMessages.map(msg => {
                // If this is a campaign message, enrich it with template info
                if (msg.campaign_id && campaignTemplateMap[msg.campaign_id]) {
                    const templateInfo = campaignTemplateMap[msg.campaign_id];
                    const templateId = templateInfo.template_id;
                    
                    return {
                        ...msg,
                        campaign_name: templateInfo.campaign_name,
                        // Use content from chat_messages (actual sent message with replaced variables)
                        // Don't override content - it already has the actual values
                        template: {
                            header_type: templateInfo.header_type,
                            header_content: templateInfo.header_content,
                            body_text: templateInfo.body_text, // Keep original for reference, but content field has actual values
                            footer_text: templateInfo.footer_text,
                            buttons: templateButtonsMap[templateId] || [],
                            variables: templateInfo.variables
                        }
                    };
                }
                return msg;
            });

            // Get campaign messages from messages table that are NOT in chat_messages
            // (for backward compatibility with old campaign messages)
            const [allCampaignMessages] = await connection.query(
                `SELECT
                m.id,
                m.status,
                m.timestamp,
                m.error,
                c.id as campaign_id,
                c.name as campaign_name,
                t.header_type,
                t.header_content,
                t.body_text,
                t.footer_text,
                t.id as template_id,
                t.variables,
                ct.wanumber
             FROM messages m
             JOIN campaigns c ON m.campaign_id = c.id
             JOIN contacts ct ON m.contact_id = ct.id
             JOIN templates t ON c.template_id = t.id
             WHERE c.business_id = ?
             ORDER BY m.timestamp ASC`, [businessId]
            );

            // Filter campaign messages by normalized phone number
            const campaignMessages = allCampaignMessages.filter(msg => 
                comparePhoneNumbers(msg.wanumber, normalizedPhone)
            );

            // Get buttons for legacy campaign messages
            const legacyTemplateIds = campaignMessages.map(msg => msg.template_id);
            let legacyTemplateButtons = [];

            if (legacyTemplateIds.length > 0) {
                const [buttons] = await connection.query(
                    `SELECT template_id, type, text, value, button_order
                 FROM template_buttons
                 WHERE template_id IN (?)
                 ORDER BY template_id, button_order`, [legacyTemplateIds]
                );
                legacyTemplateButtons = buttons;
            }

            // Group buttons by template_id
            const legacyButtonsByTemplate = legacyTemplateButtons.reduce((acc, button) => {
                if (!acc[button.template_id]) {
                    acc[button.template_id] = [];
                }
                acc[button.template_id].push({
                    type: button.type,
                    text: button.text,
                    value: button.value,
                    button_order: button.button_order
                });
                return acc;
            }, {});

            // Create a set of timestamps from chat_messages to avoid duplicates
            const chatMessageTimestamps = new Set(
                enrichedChatMessages.map(msg => new Date(msg.timestamp).getTime())
            );

            // Format legacy campaign messages (only if not already in chat_messages)
            const formattedCampaignMessages = campaignMessages
                .filter(msg => {
                    // Only include if not already in chat_messages (check by timestamp)
                    const msgTimestamp = new Date(msg.timestamp).getTime();
                    return !chatMessageTimestamps.has(msgTimestamp);
                })
                .map(msg => ({
                    id: msg.id,
                    conversation_id: conversationId,
                    direction: 'outbound',
                    message_type: 'template',
                    status: msg.status,
                    timestamp: msg.timestamp,
                    campaign_id: msg.campaign_id,
                    campaign_name: msg.campaign_name,
                    template: {
                        header_type: msg.header_type,
                        header_content: msg.header_content,
                        body_text: msg.body_text,
                        footer_text: msg.footer_text,
                        buttons: legacyButtonsByTemplate[msg.template_id] || [],
                        variables: msg.variables ? JSON.parse(msg.variables) : {}
                    },
                    error: msg.error
                }));

            // Combine and sort all messages by timestamp
            allMessages = [...enrichedChatMessages, ...formattedCampaignMessages].sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            // Mark live messages as read (don't mark history messages as read)
            if (chatMessages.length > 0) {
                await connection.query(
                    `UPDATE chat_messages
                 SET read_at = NOW()
                 WHERE conversation_id = ? AND direction = 'inbound' AND read_at IS NULL`, [conversationId]
                );

                // Update conversation unread count
                await connection.query(
                    `UPDATE conversations
                 SET unread_count = 0
                 WHERE id = ?`, [conversationId]
                );
            }

            return allMessages;
        } finally {
            connection.release();
        }
    }

    static async getConversationHistory(conversationId, businessId, limit = 100, offset = 0) {
        const connection = await pool.getConnection();
        try {
            // Verify conversation access
            const [conversation] = await connection.query(
                `SELECT phone_number FROM conversations
             WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or unauthorized');
            }

            // Get historical messages with pagination
            const [historyMessages] = await connection.query(
                `SELECT * FROM chat_messages_history
             WHERE conversation_id = ?
             ORDER BY timestamp DESC
             LIMIT ? OFFSET ?`, [conversationId, limit, offset]
            );

            // Return in chronological order (oldest first)
            return historyMessages.reverse();
        } finally {
            connection.release();
        }
    }

    static async sendMessage(conversationId, messageData, businessId, wss) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Get conversation details
            const [conversation] = await connection.query(
                `SELECT c.* FROM conversations c
             WHERE c.id = ? AND c.business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            const { phone_number } = conversation[0];

            // Send message via WhatsApp
            const sendResult = await ConversationService.sendMessage({
                to: phone_number,
                businessId: businessId,
                ...messageData
            });

            // Check if this is a template message with flow_id
            let flowId = null;
            if (messageData.templateId) {
                // If it's a template message, check if it has flow buttons
                const [templateButtons] = await pool.query(
                    `SELECT flow_id FROM template_buttons
                    WHERE template_id = ? AND type = 'FLOW'
                    LIMIT 1`,
                    [messageData.templateId]
                );

                if (templateButtons.length > 0) {
                    flowId = templateButtons[0].flow_id;
                    console.log('Template has WhatsApp Flow, storing flow_id:', flowId);
                }
            }

            // Insert message record
            const messageId = uuidv4();
            await connection.query(
                `INSERT INTO chat_messages
                (id, conversation_id, whatsapp_message_id, direction,
                message_type, content, status, timestamp, is_auto_reply, auto_reply_id, flow_id)
                VALUES (?, ?, ?, 'outbound', ?, ?, 'sent', NOW(), FALSE, NULL, ?)`, [
                    messageId,
                    conversationId,
                    sendResult.messageId,
                    messageData.messageType,
                    messageData.content,
                    flowId
                ]
            );

            // Update conversation last message
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

            // Notify via WebSocket
            if (wss && typeof wss.notifyNewMessage === 'function') {
                try {
                    wss.notifyNewMessage(businessId, conversationId, message[0]);
                } catch (wsError) {
                    console.error("Error in WebSocket notification:", wsError);
                }
            }

            return {
                messageId,
                whatsappMessageId: sendResult.messageId,
                message: message[0]
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Simplified close conversation
    static async closeConversation(conversationId, businessId) {
        const connection = await pool.getConnection();
        try {
            const [conversation] = await connection.execute(
                `SELECT * FROM conversations 
                WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            if (conversation[0].status === 'closed') {
                throw new Error('Conversation is already closed');
            }

            await connection.execute(
                `UPDATE conversations 
                SET status = 'closed', closed_at = NOW() 
                WHERE id = ?`, [conversationId]
            );

            return {
                success: true,
                message: 'Conversation closed successfully',
                conversationId: conversationId
            };
        } finally {
            connection.release();
        }
    }

    // New archive conversation functionality
    static async archiveConversation(conversationId, businessId) {
        const connection = await pool.getConnection();
        try {
            const [conversation] = await connection.execute(
                `SELECT * FROM conversations 
                WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            if (conversation[0].status === 'archived') {
                throw new Error('Conversation is already archived');
            }

            await connection.execute(
                `UPDATE conversations 
                SET status = 'archived', archived_at = NOW() 
                WHERE id = ?`, [conversationId]
            );

            return {
                success: true,
                message: 'Conversation archived successfully',
                conversationId: conversationId
            };
        } finally {
            connection.release();
        }
    }

    // Reopen conversation (unarchive/reactivate)
    static async reopenConversation(conversationId, businessId) {
        const connection = await pool.getConnection();
        try {
            const [conversation] = await connection.execute(
                `SELECT * FROM conversations 
                WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            if (conversation[0].status === 'active') {
                throw new Error('Conversation is already active');
            }

            await connection.execute(
                `UPDATE conversations 
                SET status = 'active', archived_at = NULL, closed_at = NULL 
                WHERE id = ?`, [conversationId]
            );

            return {
                success: true,
                message: 'Conversation reopened successfully',
                conversationId: conversationId
            };
        } finally {
            connection.release();
        }
    }

    // Delete conversation
    static async deleteConversation(conversationId, businessId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Verify conversation exists and belongs to business
            const [conversation] = await connection.execute(
                `SELECT * FROM conversations 
                WHERE id = ? AND business_id = ?`, [conversationId, businessId]
            );

            if (!conversation.length) {
                throw new Error('Conversation not found or access denied');
            }

            // Delete all chat messages associated with this conversation
            await connection.execute(
                'DELETE FROM chat_messages WHERE conversation_id = ?', [conversationId]
            );

            // Delete the conversation
            await connection.execute(
                'DELETE FROM conversations WHERE id = ?', [conversationId]
            );

            await connection.commit();

            return {
                success: true,
                message: 'Conversation deleted successfully',
                conversationId: conversationId
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Bulk delete conversations
    static async deleteConversations(conversationIds, businessId) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            if (!conversationIds || conversationIds.length === 0) {
                throw new Error('No conversation IDs provided');
            }

            // Verify all conversations exist and belong to business
            const placeholders = conversationIds.map(() => '?').join(',');
            const [conversations] = await connection.execute(
                `SELECT id FROM conversations 
                WHERE id IN (${placeholders}) AND business_id = ?`,
                [...conversationIds, businessId]
            );

            if (conversations.length === 0) {
                throw new Error('No valid conversations found or access denied');
            }

            const validConversationIds = conversations.map(c => c.id);

            // Delete all chat messages associated with these conversations
            const messagePlaceholders = validConversationIds.map(() => '?').join(',');
            await connection.execute(
                `DELETE FROM chat_messages WHERE conversation_id IN (${messagePlaceholders})`,
                validConversationIds
            );

            // Delete the conversations
            const conversationPlaceholders = validConversationIds.map(() => '?').join(',');
            const [result] = await connection.execute(
                `DELETE FROM conversations WHERE id IN (${conversationPlaceholders})`,
                validConversationIds
            );

            await connection.commit();

            return {
                success: true,
                message: `Successfully deleted ${result.affectedRows} conversation(s)`,
                deletedCount: result.affectedRows
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // Get conversation statistics
    static async getConversationStats(businessId) {
        const connection = await pool.getConnection();
        try {
            const [stats] = await connection.query(`
                SELECT 
                    COUNT(*) as total_conversations,
                    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_conversations,
                    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_conversations,
                    SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_conversations,
                    SUM(unread_count) as total_unread_messages
                FROM conversations 
                WHERE business_id = ?
            `, [businessId]);

            return stats[0];
        } finally {
            connection.release();
        }
    }

    static async ensureConversationForCampaign(businessId, phoneNumber, contactId = null) {
        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Normalize phone number
            const normalizedPhone = normalizePhoneNumber(phoneNumber);
            if (!normalizedPhone) {
                throw new Error('Invalid phone number');
            }

            // Check if active conversation exists - compare normalized numbers
            const [allConversations] = await connection.query(
                `SELECT * FROM conversations 
                WHERE business_id = ? AND status = 'active'
                ORDER BY last_message_at DESC`, [businessId]
            );

            // Find conversation with matching normalized phone number
            const existing = allConversations.find(conv => 
                comparePhoneNumbers(conv.phone_number, normalizedPhone)
            );

            if (existing) {
                await connection.commit();
                return existing;
            }

            // Create new conversation for campaign recipient
            const conversationId = uuidv4();

            // If contactId not provided, try to find the contact - compare normalized numbers
            let finalContactId = contactId;
            if (!finalContactId) {
                const [allContacts] = await connection.query(
                    `SELECT id, wanumber FROM contacts 
                    WHERE business_id = ?`, [businessId]
                );
                
                // Find contact with matching normalized phone number
                const contact = allContacts.find(c => 
                    comparePhoneNumbers(c.wanumber, normalizedPhone)
                );
                finalContactId = contact ? contact.id : null;
            }

            
            // Insert conversation record with normalized phone number
            await connection.query(
                `INSERT INTO conversations 
                (id, business_id, phone_number, contact_id, status, last_message_at) 
                VALUES (?, ?, ?, ?, 'active', NOW())`, [
                    conversationId,
                    businessId,
                    normalizedPhone,
                    finalContactId
                ]
            );

            await connection.commit();

            return {
                id: conversationId,
                business_id: businessId,
                phone_number: normalizedPhone,
                contact_id: finalContactId,
                status: 'active'
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
}

module.exports = ConversationController;