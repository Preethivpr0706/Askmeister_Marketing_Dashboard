// Migration script to create chat_messages_history table
// Run this once to create the history table for old chat messages

const { pool } = require('./config/database');
require('dotenv').config();

async function createChatHistoryTable() {
    const connection = await pool.getConnection();

    try {
        console.log('Creating chat_messages_history table...');

        // Check if table exists
        const [tables] = await connection.query('SHOW TABLES LIKE "chat_messages_history"');

        if (tables.length > 0) {
            console.log('📋 chat_messages_history table already exists!');

            // Check if the table has the correct structure
            const [columns] = await connection.query('DESCRIBE chat_messages_history');
            const hasAllColumns = columns.some(col => col.Field === 'flow_node_id') &&
                                 columns.some(col => col.Field === 'flow_session_id');

            if (!hasAllColumns) {
                console.log('🔄 Recreating table with correct structure...');
                await connection.query('DROP TABLE chat_messages_history');
                console.log('🗑️ Dropped old table structure');
            } else {
                console.log('✅ chat_messages_history table has correct structure!');
                return;
            }
        }

        // Create chat_messages_history table with same structure as chat_messages
        await connection.query(`
            CREATE TABLE chat_messages_history (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                whatsapp_message_id VARCHAR(255),
                direction ENUM('inbound', 'outbound') NOT NULL,
                message_type VARCHAR(100),
                content TEXT,
                media_url VARCHAR(512),
                media_filename VARCHAR(255),
                status ENUM('sent', 'delivered', 'read', 'failed', 'sending') DEFAULT 'sending',
                timestamp TIMESTAMP NOT NULL,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL,
                whatsapp_media_id VARCHAR(255),
                is_auto_reply BOOLEAN DEFAULT FALSE,
                auto_reply_id VARCHAR(36) DEFAULT NULL,
                is_bot BOOLEAN DEFAULT FALSE,
                is_campaign BOOLEAN DEFAULT FALSE,
                campaign_id VARCHAR(255) DEFAULT NULL,
                interactive_data TEXT,
                flow_id VARCHAR(36) DEFAULT NULL,
                flow_node_id VARCHAR(50) DEFAULT NULL,
                flow_session_id VARCHAR(255) DEFAULT NULL,
                file_size VARCHAR(255) DEFAULT NULL,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conversation (conversation_id),
                INDEX idx_whatsapp_id (whatsapp_message_id),
                INDEX idx_archived_at (archived_at),
                INDEX idx_timestamp (timestamp),
                INDEX idx_is_auto_reply (is_auto_reply),
                INDEX idx_flow_id (flow_id),
                INDEX idx_flow_session_id (flow_session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);

        console.log('✅ chat_messages_history table created successfully!');

        // Create indexes for better performance
        await connection.query(`
            CREATE INDEX idx_history_conversation_timestamp ON chat_messages_history(conversation_id, timestamp)
        `);

        await connection.query(`
            CREATE INDEX idx_history_business_timestamp ON chat_messages_history(archived_at)
        `);

        console.log('✅ Indexes created successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);

        // Provide manual SQL commands as fallback
        console.log('\n🔧 Manual SQL commands (run these in your database):');
        console.log(`
            CREATE TABLE chat_messages_history (
                id VARCHAR(36) PRIMARY KEY,
                conversation_id VARCHAR(36) NOT NULL,
                whatsapp_message_id VARCHAR(255),
                direction ENUM('inbound', 'outbound') NOT NULL,
                message_type VARCHAR(100),
                content TEXT,
                media_url VARCHAR(512),
                media_filename VARCHAR(255),
                status ENUM('sent', 'delivered', 'read', 'failed', 'sending') DEFAULT 'sending',
                timestamp TIMESTAMP NOT NULL,
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NULL,
                whatsapp_media_id VARCHAR(255),
                is_auto_reply BOOLEAN DEFAULT FALSE,
                auto_reply_id VARCHAR(36) DEFAULT NULL,
                is_bot BOOLEAN DEFAULT FALSE,
                is_campaign BOOLEAN DEFAULT FALSE,
                campaign_id VARCHAR(255) DEFAULT NULL,
                interactive_data TEXT,
                flow_id VARCHAR(36) DEFAULT NULL,
                flow_node_id VARCHAR(50) DEFAULT NULL,
                flow_session_id VARCHAR(255) DEFAULT NULL,
                file_size VARCHAR(255) DEFAULT NULL,
                archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX idx_conversation (conversation_id),
                INDEX idx_whatsapp_id (whatsapp_message_id),
                INDEX idx_archived_at (archived_at),
                INDEX idx_timestamp (timestamp),
                INDEX idx_is_auto_reply (is_auto_reply),
                INDEX idx_flow_id (flow_id),
                INDEX idx_flow_session_id (flow_session_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

            CREATE INDEX idx_history_conversation_timestamp ON chat_messages_history(conversation_id, timestamp);
            CREATE INDEX idx_history_business_timestamp ON chat_messages_history(archived_at);
        `);

    } finally {
        connection.release();
    }
}

// Run migration
createChatHistoryTable();
