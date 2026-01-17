// Migration script to move old chat messages to history
// This script moves messages older than 7 days from chat_messages to chat_messages_history
// Also cleans up media files associated with archived messages

const { pool } = require('./config/database');
const fs = require('fs');
const path = require('path');
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

        // Clean up media files for archived messages
        await cleanupArchivedMedia(cutoffDateString);

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

        // Clean up media files for archived messages
        await cleanupArchivedMedia(cutoffDateString);

    } catch (error) {
        await connection.rollback();
        console.error('❌ Full migration failed:', error.message);
        throw error;
    } finally {
        connection.release();
    }
}

/**
 * Clean up media files associated with archived messages (older than 7 days)
 * This function:
 * 1. Finds all media URLs in chat_messages_history older than cutoff date
 * 2. Excludes media files referenced in chatbot_nodes (chatbot media must be preserved)
 * 3. Deletes those files from disk
 * 4. Optionally cleans up business_files entries not referenced in active messages or chatbot nodes
 */
async function cleanupArchivedMedia(cutoffDateString) {
    const connection = await pool.getConnection();
    try {
        console.log('🧹 Starting media cleanup for archived messages...');

        // Get all media URLs from archived messages older than cutoff date
        // BUT exclude media files that are:
        // 1. Still referenced in active messages
        // 2. Referenced in chatbot_nodes (chatbot media files should be preserved)
        const [archivedMedia] = await connection.query(
            `SELECT DISTINCT cmh.media_url, cmh.media_filename, cmh.whatsapp_media_id
             FROM chat_messages_history cmh
             WHERE cmh.timestamp < ?
             AND cmh.media_url IS NOT NULL
             AND cmh.media_url != ''
             AND NOT EXISTS (
                 SELECT 1 FROM chat_messages cm
                 WHERE cm.media_url = cmh.media_url
             )
             AND NOT EXISTS (
                 SELECT 1 FROM business_files bf
                 INNER JOIN chatbot_nodes cn ON (
                     cn.metadata IS NOT NULL
                     AND (
                         JSON_EXTRACT(cn.metadata, '$.fileId') = bf.id
                         OR JSON_EXTRACT(cn.metadata, '$.fileId') = CAST(bf.id AS CHAR)
                         OR JSON_UNQUOTE(JSON_EXTRACT(cn.metadata, '$.fileId')) = bf.id
                     )
                 )
                 WHERE bf.file_url = cmh.media_url
                 OR bf.file_url LIKE CONCAT('%/', SUBSTRING_INDEX(cmh.media_url, '/', -1))
             )`, [cutoffDateString]
        );

        console.log(`📁 Found ${archivedMedia.length} unique media files to clean up (chatbot media files excluded)`);

        let deletedCount = 0;
        let errorCount = 0;
        const uploadsBaseDir = path.join(__dirname, 'public', 'uploads');

        for (const media of archivedMedia) {
            try {
                // Parse media_url (format: /uploads/{businessId}/{filename})
                const mediaUrl = media.media_url;
                if (!mediaUrl || !mediaUrl.startsWith('/uploads/')) {
                    continue;
                }

                // Extract businessId and filename from URL
                const urlParts = mediaUrl.replace('/uploads/', '').split('/');
                if (urlParts.length !== 2) {
                    console.warn(`⚠️ Invalid media URL format: ${mediaUrl}`);
                    continue;
                }

                const [businessId, filename] = urlParts;
                const filePath = path.join(uploadsBaseDir, businessId, filename);

                // Check if file exists and delete it
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                    deletedCount++;
                    console.log(`🗑️ Deleted: ${filePath}`);
                } else {
                    console.log(`ℹ️ File not found (may already be deleted): ${filePath}`);
                }
            } catch (fileError) {
                errorCount++;
                console.error(`❌ Error deleting file ${media.media_url}:`, fileError.message);
                // Continue with other files even if one fails
            }
        }

        console.log(`✅ Media cleanup completed: ${deletedCount} files deleted, ${errorCount} errors`);

        // Optional: Clean up business_files entries that are not referenced in active messages
        // This handles files uploaded but never used, or files from very old messages
        await cleanupOrphanedBusinessFiles(cutoffDateString);

    } catch (error) {
        console.error('❌ Media cleanup failed:', error.message);
        // Don't throw - media cleanup failure shouldn't break the migration
    } finally {
        connection.release();
    }
}

/**
 * Clean up business_files entries that are:
 * 1. Older than 7 days AND
 * 2. Not referenced in any active chat_messages AND
 * 3. Not referenced in chatbot_nodes metadata (chatbot media files must be preserved)
 */
async function cleanupOrphanedBusinessFiles(cutoffDateString) {
    const connection = await pool.getConnection();
    try {
        console.log('🧹 Starting cleanup of orphaned business_files...');

        // Find business_files that:
        // - Are older than 7 days
        // - Are not referenced in active chat_messages (via media_url matching file_url)
        // - Are not referenced in chatbot_nodes metadata (chatbot media files should be preserved)
        const [orphanedFiles] = await connection.query(
            `SELECT bf.id, bf.business_id, bf.storage_filename, bf.file_url, bf.created_at
             FROM business_files bf
             WHERE bf.created_at < ?
             AND NOT EXISTS (
                 SELECT 1 FROM chat_messages cm
                 WHERE cm.media_url = bf.file_url
                 OR cm.media_url LIKE CONCAT('%/', bf.storage_filename)
             )
             AND NOT EXISTS (
                 SELECT 1 FROM chat_messages_history cmh
                 WHERE cmh.media_url = bf.file_url
                 OR cmh.media_url LIKE CONCAT('%/', bf.storage_filename)
             )
             AND NOT EXISTS (
                 SELECT 1 FROM chatbot_nodes cn
                 WHERE cn.metadata IS NOT NULL
                 AND (
                     JSON_EXTRACT(cn.metadata, '$.fileId') = bf.id
                     OR JSON_EXTRACT(cn.metadata, '$.fileId') = CAST(bf.id AS CHAR)
                     OR JSON_UNQUOTE(JSON_EXTRACT(cn.metadata, '$.fileId')) = bf.id
                 )
             )`, [cutoffDateString]
        );

        console.log(`📁 Found ${orphanedFiles.length} orphaned business_files to clean up (chatbot media files excluded)`);

        let deletedCount = 0;
        let errorCount = 0;
        const uploadsBaseDir = path.join(__dirname, 'public', 'uploads');

        for (const file of orphanedFiles) {
            try {
                // Delete file from disk
                const filePath = path.join(uploadsBaseDir, file.business_id, file.storage_filename);
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                    console.log(`🗑️ Deleted orphaned file: ${filePath}`);
                }

                // Delete database record
                await connection.query(
                    `DELETE FROM business_files WHERE id = ?`, [file.id]
                );

                deletedCount++;
            } catch (fileError) {
                errorCount++;
                console.error(`❌ Error cleaning up business_file ${file.id}:`, fileError.message);
            }
        }

        console.log(`✅ Orphaned files cleanup completed: ${deletedCount} files deleted, ${errorCount} errors`);

    } catch (error) {
        console.error('❌ Orphaned files cleanup failed:', error.message);
        // Don't throw - cleanup failure shouldn't break the migration
    } finally {
        connection.release();
    }
}

// Export functions for use in scheduler
module.exports = {
    migrateOldMessages,
    migrateAllOldMessages,
    cleanupArchivedMedia,
    cleanupOrphanedBusinessFiles
};

// Run migration if called directly
if (require.main === module) {
    migrateAllOldMessages().catch(console.error);
}
