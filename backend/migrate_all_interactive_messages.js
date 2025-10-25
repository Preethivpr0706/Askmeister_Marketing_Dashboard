const { pool } = require('./config/database');

async function migrateAllInteractiveMessages() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Starting comprehensive migration of interactive messages...');
        
        // Fix all messages with message_type = 'button'
        const [buttonMessages] = await connection.query(`
            SELECT id, content, interactive_data, direction
            FROM chat_messages 
            WHERE message_type = 'button'
        `);
        
        console.log(`Found ${buttonMessages.length} button messages to migrate`);
        
        for (const message of buttonMessages) {
            try {
                let newContent = message.content;
                let interactiveData = null;
                
                if (message.interactive_data) {
                    // If interactive_data exists, use it
                    interactiveData = JSON.parse(message.interactive_data);
                    if (interactiveData.button_text) {
                        newContent = interactiveData.button_text;
                    } else if (interactiveData.list_item_title) {
                        newContent = interactiveData.list_item_title;
                    }
                } else {
                    // If no interactive_data, create basic structure
                    newContent = message.content === 'button message' ? 'Button clicked' : message.content;
                    interactiveData = {
                        type: 'button',
                        button_text: newContent,
                        button_id: 'unknown'
                    };
                }
                
                // Update the message
                await connection.query(`
                    UPDATE chat_messages 
                    SET message_type = 'interactive', 
                        content = ?,
                        interactive_data = ?
                    WHERE id = ?
                `, [newContent, JSON.stringify(interactiveData), message.id]);
                
                console.log(`Updated message ${message.id}: "${newContent}" (${message.direction})`);
            } catch (error) {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
        
        // Fix messages with message_type = 'interactive' but content = 'button message'
        const [interactiveMessages] = await connection.query(`
            SELECT id, content, interactive_data, direction
            FROM chat_messages 
            WHERE message_type = 'interactive' 
            AND content = 'button message'
            AND interactive_data IS NOT NULL
        `);
        
        console.log(`Found ${interactiveMessages.length} interactive messages with generic content to fix`);
        
        for (const message of interactiveMessages) {
            try {
                const interactiveData = JSON.parse(message.interactive_data);
                let newContent = message.content;
                
                if (interactiveData.button_text) {
                    newContent = interactiveData.button_text;
                } else if (interactiveData.list_item_title) {
                    newContent = interactiveData.list_item_title;
                }
                
                if (newContent !== message.content) {
                    await connection.query(`
                        UPDATE chat_messages 
                        SET content = ?
                        WHERE id = ?
                    `, [newContent, message.id]);
                    
                    console.log(`Fixed content for message ${message.id}: "${newContent}"`);
                }
            } catch (error) {
                console.error(`Error processing message ${message.id}:`, error);
            }
        }
        
        console.log('Comprehensive migration completed successfully');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) {
            connection.release();
            console.log('Database connection released.');
        }
    }
}

migrateAllInteractiveMessages();
