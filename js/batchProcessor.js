/**
 * BatchProcessor - Handles batch processing of multiple images
 * with progress tracking and error recovery
 */

class BatchProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.results = [];
        this.errors = [];
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.shouldStop = false;
        this.imageProcessor = new ImageProcessor();
        this.watermarkEngine = new WatermarkEngine();
    }

    /**
     * Add images to processing queue
     */
    addToQueue(images, settings) {
        try {
            if (!Array.isArray(images)) images = [images];

            const clonedSettings = Array.isArray(settings)
                ? settings.map(s => JSON.parse(JSON.stringify(s)))
                : JSON.parse(JSON.stringify(settings));

            const queueItems = images.map((image, index) => ({
                id: `${Date.now()}_${index}`,
                image: image,
                settings: clonedSettings, // deep cloned (single or array)
                status: 'pending',
                result: null,
                error: null,
                progress: 0
            }));

            this.processingQueue.push(...queueItems);
            return queueItems.map(item => item.id);

        } catch (error) {
            console.error('Error adding to queue:', error);
            throw new Error(`Failed to add images to queue: ${error.message}`);
        }
    }

    /**
     * Process a single image with watermark
     */
    async processImage(sourceImage, settings) {
        try {
            if (!sourceImage || !sourceImage.imageData) {
                throw new Error('Invalid source image data');
            }

            // Validate
            if (Array.isArray(settings)) {
                if (settings.length === 0) throw new Error('No watermark settings provided');
                for (const s of settings) {
                    const validation = this.watermarkEngine.validateSettings(s);
                    if (!validation.isValid) {
                        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                    }
                }
            } else {
                const validation = this.watermarkEngine.validateSettings(settings);
                if (!validation.isValid) {
                    throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                }
            }

            // Apply watermark(s)
            console.log(`📸 Processing image: ${sourceImage.name}`);
            console.log(`   Settings type: ${Array.isArray(settings) ? 'Multiple' : 'Single'}`);
            if (Array.isArray(settings)) {
                console.log(`   Watermarks count: ${settings.length}`);
                settings.forEach((s, i) => {
                    console.log(`   Watermark ${i + 1}: ${s.type} - ${s.type === 'text' ? s.text.content : 'image'}`);
                });
            } else {
                console.log(`   Single watermark: ${settings.type} - ${settings.type === 'text' ? settings.text.content : 'image'}`);
            }
            
            const result = Array.isArray(settings)
                ? await this.watermarkEngine.generateWatermarkedImageMultiple(sourceImage.imageData, settings)
                : await this.watermarkEngine.generateWatermarkedImage(sourceImage.imageData, settings);

            const outputName = this.generateOutputFilename(sourceImage.name, Array.isArray(settings) ? settings[0] : settings);

            return {
                id: sourceImage.id,
                name: outputName,
                originalName: sourceImage.name,
                dataUrl: result.dataUrl,
                width: result.width,
                height: result.height,
                format: result.format,
                originalSize: sourceImage.size,
                processedSize: this.estimateDataUrlSize(result.dataUrl),
                processingTime: Date.now(),
                settings: Array.isArray(settings) ? settings.map(s => ({ ...s })) : { ...settings }
            };

        } catch (error) {
            console.error('Error processing single image:', error);
            throw new Error(`Failed to process ${sourceImage.name}: ${error.message}`);
        }
    }

    /**
     * Process entire queue
     */
    async processQueue() {
        if (this.isProcessing) {
            throw new Error('Already processing queue');
        }

        if (this.processingQueue.length === 0) {
            throw new Error('No images in queue to process');
        }

        try {
            this.isProcessing = true;
            this.shouldStop = false;
            this.results = [];
            this.errors = [];

            const startTime = Date.now();
            const totalItems = this.processingQueue.length;

            for (let i = 0; i < this.processingQueue.length; i++) {
                if (this.shouldStop) {
                    break;
                }

                const item = this.processingQueue[i];
                
                try {
                    // Update progress
                    item.status = 'processing';
                    this.reportProgress(i, totalItems, `Processing ${item.image.name}...`);

                    // Process image
                    const result = await this.processImage(item.image, item.settings);
                    
                    item.result = result;
                    item.status = 'completed';
                    this.results.push(result);

                    // Small delay to show progress and prevent browser freezing
                    await this.delay(50);

                } catch (error) {
                    item.error = error.message;
                    item.status = 'failed';
                    this.errors.push({
                        image: item.image.name,
                        error: error.message
                    });

                    console.error(`Failed to process ${item.image.name}:`, error);
                }
            }

            const processingTime = Date.now() - startTime;
            const summary = this.generateProcessingSummary(processingTime);

            // Report completion
            if (this.onComplete) {
                this.onComplete(summary);
            }

            return summary;

        } catch (error) {
            console.error('Error processing queue:', error);
            if (this.onError) {
                this.onError(error.message);
            }
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Stop processing queue
     */
    stopProcessing() {
        this.shouldStop = true;
    }

    /**
     * Clear processing queue
     */
    clearQueue() {
        if (this.isProcessing) {
            this.stopProcessing();
        }
        this.processingQueue = [];
        this.results = [];
        this.errors = [];
    }

    /**
     * Get queue status
     */
    getQueueStatus() {
        const total = this.processingQueue.length;
        const completed = this.processingQueue.filter(item => item.status === 'completed').length;
        const failed = this.processingQueue.filter(item => item.status === 'failed').length;
        const pending = this.processingQueue.filter(item => item.status === 'pending').length;
        const processing = this.processingQueue.filter(item => item.status === 'processing').length;

        return {
            total,
            completed,
            failed,
            pending,
            processing,
            isProcessing: this.isProcessing,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }

    /**
     * Generate processing summary
     */
    generateProcessingSummary(processingTime) {
        const status = this.getQueueStatus();
        
        return {
            ...status,
            processingTime,
            averageTimePerImage: status.completed > 0 ? processingTime / status.completed : 0,
            results: this.results,
            errors: this.errors,
            totalOriginalSize: this.results.reduce((sum, result) => sum + (result.originalSize || 0), 0),
            totalProcessedSize: this.results.reduce((sum, result) => sum + (result.processedSize || 0), 0)
        };
    }

    /**
     * Process images with custom settings per image
     */
    async processWithCustomSettings(imageSettingsPairs) {
        try {
            this.clearQueue();
            
            const results = [];
            const errors = [];
            const total = imageSettingsPairs.length;

            for (let i = 0; i < imageSettingsPairs.length; i++) {
                const { image, settings } = imageSettingsPairs[i];
                
                try {
                    this.reportProgress(i, total, `Processing ${image.name}...`);
                    
                    const result = await this.processImage(image, settings);
                    results.push(result);
                    
                } catch (error) {
                    errors.push({
                        image: image.name,
                        error: error.message
                    });
                }
                
                await this.delay(50);
            }

            return {
                total,
                completed: results.length,
                failed: errors.length,
                results,
                errors
            };

        } catch (error) {
            console.error('Error processing with custom settings:', error);
            throw new Error(`Batch processing failed: ${error.message}`);
        }
    }

    /**
     * Create preview batch
     */
    async createPreviewBatch(images, settings, maxPreviewSize = 200) {
        try {
            const previews = [];

            for (let i = 0; i < Math.min(images.length, 10); i++) {
                try {
                    const preview = Array.isArray(settings)
                        ? await this.watermarkEngine.generatePreviewMultiple(images[i].imageData, settings, maxPreviewSize)
                        : await this.watermarkEngine.generatePreview(images[i].imageData, settings, maxPreviewSize);

                    previews.push({
                        originalName: images[i].name,
                        previewDataUrl: preview.dataUrl,
                        width: preview.width,
                        height: preview.height
                    });

                } catch (error) {
                    console.warn(`Failed to create preview for ${images[i].name}:`, error);
                }
            }

            return previews;

        } catch (error) {
            console.error('Error creating preview batch:', error);
            throw new Error(`Failed to create preview batch: ${error.message}`);
        }
    }

    /**
     * Optimize batch processing settings
     */
    optimizeSettings(images, baseSettings) {
        try {
            const optimizations = [];
            
            images.forEach(image => {
                const optimized = { ...baseSettings };
                
                // Optimize based on image characteristics
                const info = this.imageProcessor.getImageInfo(image.imageData);
                
                if (info) {
                    // Adjust text size based on image resolution
                    if (optimized.type === 'text' || optimized.type === 'combined') {
                        const scaleFactor = Math.min(info.width, info.height) / 1000;
                        optimized.text.size = Math.round(optimized.text.size * Math.max(0.5, scaleFactor));
                    }
                    
                    // Adjust image watermark scale
                    if (optimized.type === 'image' || optimized.type === 'combined') {
                        if (optimized.image.imageData) {
                            const wmInfo = this.imageProcessor.getImageInfo(optimized.image.imageData);
                            if (wmInfo) {
                                const maxWmSize = Math.min(info.width, info.height) * 0.3;
                                const currentWmSize = Math.max(wmInfo.width, wmInfo.height) * (optimized.image.scale / 100);
                                
                                if (currentWmSize > maxWmSize) {
                                    optimized.image.scale = Math.round((maxWmSize / Math.max(wmInfo.width, wmInfo.height)) * 100);
                                }
                            }
                        }
                    }
                }
                
                optimizations.push({
                    image,
                    settings: optimized
                });
            });

            return optimizations;

        } catch (error) {
            console.error('Error optimizing settings:', error);
            return images.map(image => ({ image, settings: baseSettings }));
        }
    }

    /**
     * Generate output filename
     */
    generateOutputFilename(originalName, settings) {
        try {
            const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
            const ext = settings.output.format === 'jpeg' ? 'jpg' : 
                       settings.output.format === 'png' ? 'png' : 'webp';
            
            const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
            return `${nameWithoutExt}_watermarked_${timestamp}.${ext}`;

        } catch (error) {
            return `watermarked_${Date.now()}.png`;
        }
    }

    /**
     * Estimate data URL file size
     */
    estimateDataUrlSize(dataUrl) {
        try {
            const base64 = dataUrl.split(',')[1];
            const padding = (base64.match(/=/g) || []).length;
            return Math.round((base64.length * 0.75) - padding);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Report progress to callback
     */
    reportProgress(current, total, message) {
        const percent = Math.round((current / total) * 100);
        
        if (this.onProgress) {
            this.onProgress({
                current,
                total,
                percent,
                message
            });
        }
    }

    /**
     * Utility delay function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Set progress callback
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    /**
     * Set completion callback
     */
    setCompletionCallback(callback) {
        this.onComplete = callback;
    }

    /**
     * Set error callback
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * Get processing statistics
     */
    getStatistics() {
        return {
            totalProcessed: this.results.length,
            totalErrors: this.errors.length,
            averageProcessingTime: this.results.length > 0 ? 
                this.results.reduce((sum, r) => sum + (r.processingTime || 0), 0) / this.results.length : 0,
            totalDataProcessed: this.results.reduce((sum, r) => sum + (r.originalSize || 0), 0),
            compressionRatio: this.calculateCompressionRatio()
        };
    }

    /**
     * Calculate average compression ratio
     */
    calculateCompressionRatio() {
        const validResults = this.results.filter(r => r.originalSize && r.processedSize);
        
        if (validResults.length === 0) return 1;
        
        const totalOriginal = validResults.reduce((sum, r) => sum + r.originalSize, 0);
        const totalProcessed = validResults.reduce((sum, r) => sum + r.processedSize, 0);
        
        return totalOriginal > 0 ? totalProcessed / totalOriginal : 1;
    }
}
