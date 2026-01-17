// utils/batchProcessor.js
/**
 * Batch processor utility for rate-limited API calls
 * Processes items in batches with configurable rate limits
 */

class BatchProcessor {
    /**
     * Process items in batches with rate limiting
     * @param {Array} items - Items to process
     * @param {Function} processor - Async function to process each item
     * @param {Object} options - Configuration options
     * @param {Function} onProgress - Optional progress callback
     * @returns {Promise<Object>} Results with success, failed, and errors
     */
    static async processBatches(items, processor, options = {}, onProgress = null) {
        const {
            batchSize = 30,           // Number of items per batch
            requestsPerMinute = 40,   // Rate limit
            delayBetweenBatches = 1500, // Delay in ms (60000ms / 40 requests = 1500ms per request)
            maxRetries = 2,           // Max retries for failed items
            retryDelay = 2000         // Delay before retry
        } = options;

        const results = {
            total: items.length,
            success: 0,
            failed: 0,
            errors: [],
            processed: 0
        };

        // Calculate delay between requests to respect rate limit
        // If we want 40 requests per minute, that's 1 request per 1.5 seconds
        const delayBetweenRequests = Math.ceil(60000 / requestsPerMinute);

        // Split items into batches
        const batches = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }

        console.log(`Processing ${items.length} items in ${batches.length} batches (${batchSize} per batch)`);

        // Process each batch
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} items)`);

            // Process items in batch with rate limiting
            const batchPromises = batch.map(async (item, itemIndex) => {
                // Add delay between requests to respect rate limit
                if (itemIndex > 0) {
                    await this.sleep(delayBetweenRequests);
                }

                let retries = 0;
                let lastError = null;

                while (retries <= maxRetries) {
                    try {
                        const result = await processor(item);
                        results.success++;
                        results.processed++;
                        
                        if (onProgress) {
                            onProgress({
                                processed: results.processed,
                                total: results.total,
                                success: results.success,
                                failed: results.failed,
                                currentItem: item,
                                result
                            });
                        }
                        return { success: true, item, result };
                    } catch (error) {
                        lastError = error;
                        retries++;

                        if (retries <= maxRetries) {
                            console.log(`Retrying item (attempt ${retries + 1}/${maxRetries + 1}):`, error.message);
                            await this.sleep(retryDelay * retries); // Exponential backoff
                        }
                    }
                }

                // All retries failed
                results.failed++;
                results.processed++;
                const errorInfo = {
                    item,
                    error: lastError.message,
                    attempts: retries
                };
                results.errors.push(errorInfo);

                if (onProgress) {
                    onProgress({
                        processed: results.processed,
                        total: results.total,
                        success: results.success,
                        failed: results.failed,
                        currentItem: item,
                        error: lastError
                    });
                }

                return { success: false, item, error: lastError };
            });

            // Wait for all items in batch to complete
            await Promise.all(batchPromises);

            // Add delay between batches (except for the last batch)
            if (batchIndex < batches.length - 1) {
                console.log(`Batch ${batchIndex + 1} completed. Waiting ${delayBetweenBatches}ms before next batch...`);
                await this.sleep(delayBetweenBatches);
            }
        }

        console.log(`Batch processing complete: ${results.success} success, ${results.failed} failed`);
        return results;
    }

    /**
     * Sleep utility function
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise}
     */
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Process items with concurrency limit (alternative approach)
     * @param {Array} items - Items to process
     * @param {Function} processor - Async function to process each item
     * @param {number} concurrency - Max concurrent operations
     * @param {Function} onProgress - Optional progress callback
     * @returns {Promise<Object>} Results
     */
    static async processWithConcurrency(items, processor, concurrency = 5, onProgress = null) {
        const results = {
            total: items.length,
            success: 0,
            failed: 0,
            errors: [],
            processed: 0
        };

        let currentIndex = 0;

        const processNext = async () => {
            while (currentIndex < items.length) {
                const item = items[currentIndex++];
                try {
                    const result = await processor(item);
                    results.success++;
                    results.processed++;

                    if (onProgress) {
                        onProgress({
                            processed: results.processed,
                            total: results.total,
                            success: results.success,
                            failed: results.failed,
                            currentItem: item,
                            result
                        });
                    }
                } catch (error) {
                    results.failed++;
                    results.processed++;
                    results.errors.push({ item, error: error.message });

                    if (onProgress) {
                        onProgress({
                            processed: results.processed,
                            total: results.total,
                            success: results.success,
                            failed: results.failed,
                            currentItem: item,
                            error
                        });
                    }
                }
            }
        };

        // Start concurrent workers
        const workers = Array(Math.min(concurrency, items.length))
            .fill(null)
            .map(() => processNext());

        await Promise.all(workers);

        return results;
    }
}

module.exports = BatchProcessor;

