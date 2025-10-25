// Chat History Scheduler Service
// This service schedules automatic migration of old chat messages to history

const cron = require('node-cron');
const { migrateOldMessages } = require('../migrate_old_messages');

class ChatHistoryScheduler {
    constructor() {
        this.isRunning = false;
        this.scheduleTask();
    }

    scheduleTask() {
        // Schedule to run every day at 2:00 AM
        // '0 2 * * *' means: minute 0, hour 2, every day of month, every month, every day of week
        cron.schedule('0 2 * * *', async () => {
            console.log('⏰ Chat history migration scheduled task started');
            await this.runMigration();
        }, {
            scheduled: false // Don't start immediately, wait for explicit start
        });

        console.log('📅 Chat history migration scheduled for daily execution at 2:00 AM');
    }

    async runMigration() {
        if (this.isRunning) {
            console.log('⚠️ Migration already running, skipping...');
            return;
        }

        this.isRunning = true;
        const startTime = Date.now();

        try {
            console.log('🔄 Starting scheduled chat history migration...');
            await migrateOldMessages();
            const duration = Date.now() - startTime;
            console.log(`✅ Scheduled migration completed in ${duration}ms`);

        } catch (error) {
            console.error('❌ Scheduled migration failed:', error.message);
            // You might want to add notification logic here (email, slack, etc.)
        } finally {
            this.isRunning = false;
        }
    }

    async runManualMigration() {
        console.log('🔄 Running manual chat history migration...');
        await this.runMigration();
    }

    // Method to start the scheduler (call this when starting the server)
    start() {
        console.log('🚀 Starting Chat History Scheduler...');
        // The cron job will start automatically when the schedule is created
    }

    // Method to stop the scheduler (useful for testing or maintenance)
    stop() {
        console.log('🛑 Stopping Chat History Scheduler...');
        // Note: node-cron doesn't have a built-in stop method for individual jobs
        // This is a placeholder for potential future implementation
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            nextRun: 'Daily at 2:00 AM'
        };
    }
}

// Export singleton instance
module.exports = new ChatHistoryScheduler();
