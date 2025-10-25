// Migration script to move old chat messages to history
// This script moves messages older than 7 days from chat_messages to chat_messages_history

const { pool } = require('./config/database');
require('dotenv').config();

async function migrateOldMessages() {
    const connection = await pool.getConnection();

    try {
        console.log('🔄 Starting chat messages migration to history...');

        // Calculate the cutoff date (7 days ago)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffDateString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

        console.log(`📅 Moving messages older than: ${cutoffDateString}`);

        // Start transaction
        await connection.beginTransaction();

        // Get count of messages to be moved
        const [countResult] = await connection.query(
            `SELECT COUNT(*) as total FROM chat_messages
             WHERE timestamp < ?`, [cutoffDateString]
        );

        const totalMessages = countResult[0].total;
        console.log(`📊 Found ${totalMessages} messages to migrate`);

        if (totalMessages === 0) {
            console.log('✅ No messages to migrate');
            await connection.rollback();
            return;
        }

        // Move messages to history table
        const insertQuery = `
            INSERT INTO chat_messages_history (
                id, conversation_id, whatsapp_message_id, direction, message_type,
                content, media_url, media_filename, status, timestamp, read_at,
                created_at, updated_at, is_auto_reply, auto_reply_id, interactive_data,
                whatsapp_media_id, file_size, is_bot, flow_id, campaign_id, is_campaign,
                flow_node_id, flow_session_id, archived_at
            )
            SELECT
                id, conversation_id, whatsapp_message_id, direction, message_type,
                content, media_url, media_filename, status, timestamp, read_at,
                created_at, updated_at, is_auto_reply, auto_reply_id, interactive_data,
                whatsapp_media_id, file_size, is_bot, flow_id, campaign_id, is_campaign,
                flow_node_id, flow_session_id, NOW()
            FROM chat_messages
            WHERE timestamp < ?
        `;

        await connection.query(insertQuery, [cutoffDateString]);
        console.log(`✅ Inserted ${totalMessages} messages into history table`);

        // Delete moved messages from live table
        await connection.query(
            `DELETE FROM chat_messages WHERE timestamp < ?`,
            [cutoffDateString]
        );
        console.log(`🗑️ Deleted ${totalMessages} messages from live chat table`);

        // Commit transaction
        await connection.commit();
        console.log('✅ Migration completed successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

async function migrateAllOldMessages() {
    const connection = await pool.getConnection();

    try {
        console.log('🔄 Starting full migration of old messages...');

        // Calculate the cutoff date (7 days ago)
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        const cutoffDateString = cutoffDate.toISOString().slice(0, 19).replace('T', ' ');

        console.log(`📅 Moving messages older than: ${cutoffDateString}`);

        // Start transaction
        await connection.beginTransaction();

        // Get count of messages to be moved
        const [countResult] = await connection.query(
            `SELECT COUNT(*) as total FROM chat_messages
             WHERE timestamp < ?`, [cutoffDateString]
        );

        const totalMessages = countResult[0].total;
        console.log(`📊 Found ${totalMessages} messages to migrate`);

        if (totalMessages === 0) {
            console.log('✅ No messages to migrate');
            await connection.rollback();
            return;
        }

        // Move messages to history table
        const insertQuery = `
            INSERT INTO chat_messages_history (
                id, conversation_id, whatsapp_message_id, direction, message_type,
                content, media_url, media_filename, status, timestamp, read_at,
                created_at, updated_at, is_auto_reply, auto_reply_id, interactive_data,
                whatsapp_media_id, file_size, is_bot, flow_id, campaign_id, is_campaign,
                flow_node_id, flow_session_id, archived_at
            )
            SELECT
                id, conversation_id, whatsapp_message_id, direction, message_type,
                content, media_url, media_filename, status, timestamp, read_at,
                created_at, updated_at, is_auto_reply, auto_reply_id, interactive_data,
                whatsapp_media_id, file_size, is_bot, flow_id, campaign_id, is_campaign,
                flow_node_id, flow_session_id, NOW()
            FROM chat_messages
            WHERE timestamp < ?
        `;

        await connection.query(insertQuery, [cutoffDateString]);
        console.log(`✅ Inserted ${totalMessages} messages into history table`);

        // Delete moved messages from live table
        await connection.query(
            `DELETE FROM chat_messages WHERE timestamp < ?`,
            [cutoffDateString]
        );
        console.log(`🗑️ Deleted ${totalMessages} messages from live chat table`);

        // Commit transaction
        await connection.commit();
        console.log('✅ Full migration completed successfully!');

    } catch (error) {
        await connection.rollback();
        console.error('❌ Full migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

// Export functions for use in scheduler
module.exports = {
    migrateOldMessages,
    migrateAllOldMessages
};

// Run migration if called directly
if (require.main === module) {
    migrateAllOldMessages().catch(console.error);
}
