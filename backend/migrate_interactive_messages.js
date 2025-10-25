const { pool } = require('./config/database');

async function migrateInteractiveMessages() {
    const connection = await pool.getConnection();
    try {
        console.log('Starting migration of interactive messages...');
        
        // Get all messages with message_type = 'button' and content = 'button message'
        const [messages] = await connection.query(`
            SELECT id, interactive_data, content 
            FROM chat_messages 
            WHERE message_type = 'button' 
            AND content = 'button message'
        `);
        
        console.log(`Found ${messages.length} messages to migrate`);
        
        for (const message of messages) {
            try {
                let actualContent = '';
                
                if (message.interactive_data) {
                    // If interactive_data exists, extract from it
                    const interactiveData = JSON.parse(message.interactive_data);
                    if (interactiveData.button_text) {
                        actualContent = interactiveData.button_text;
                    } else if (interactiveData.list_item_title) {
                        actualContent = interactiveData.list_item_title;
                    }
                } else {
                    // If no interactive_data, we can't determine the actual content
                    // Just update the message_type to 'interactive' and keep generic content
                    actualContent = 'Button clicked';
                }
                
                if (actualContent) {
                    // Update the message with correct content and message_type
                    await connection.query(`
                        UPDATE chat_messages 
                        SET content = ?, message_type = 'interactive'
                        WHERE id = ?
                    `, [actualContent, message.id]);
                    
                    console.log(`Updated message ${message.id}: "${actualContent}"`);
                }
            } catch (error) {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
        
        console.log('Migration completed successfully');
        
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        connection.release();
    }
}

// Run migration if called directly
if (require.main === module) {
    migrateInteractiveMessages()
        .then(() => {
            console.log('Migration completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateInteractiveMessages };

