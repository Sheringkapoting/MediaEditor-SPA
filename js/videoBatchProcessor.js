/**
 * VideoBatchProcessor - Handles batch processing of multiple videos
 * with progress tracking and watermark application
 */

class VideoBatchProcessor {
    constructor() {
        this.processingQueue = [];
        this.isProcessing = false;
        this.results = [];
        this.errors = [];
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.shouldStop = false;
        this.videoProcessor = new VideoProcessor();
        this.watermarkEngine = new WatermarkEngine();
    }

    /**
     * Add videos to processing queue
     */
    addToQueue(videos, settings) {
        try {
            if (!Array.isArray(videos)) videos = [videos];

            const clonedSettings = Array.isArray(settings)
                ? settings.map(s => JSON.parse(JSON.stringify(s)))
                : JSON.parse(JSON.stringify(settings));

            const queueItems = videos.map((video, index) => ({
                id: `video_${Date.now()}_${index}`,
                video: video,
                settings: clonedSettings,
                status: 'pending',
                result: null,
                error: null,
                progress: 0
            }));

            this.processingQueue.push(...queueItems);
            return queueItems.map(item => item.id);

        } catch (error) {
            console.error('Error adding videos to queue:', error);
            throw new Error(`Failed to add videos to queue: ${error.message}`);
        }
    }

    /**
     * Process a single video with watermark
     */
    async processVideo(sourceVideo, settings) {
        try {
            if (!sourceVideo || !sourceVideo.file) {
                throw new Error('Invalid source video data');
            }

            // Validate settings
            if (Array.isArray(settings)) {
                if (settings.length === 0) throw new Error('No watermark settings provided');
                for (const s of settings) {
                    const validation = this.validateVideoSettings(s);
                    if (!validation.isValid) {
                        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                    }
                }
            } else {
                const validation = this.validateVideoSettings(settings);
                if (!validation.isValid) {
                    throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                }
            }

            console.log(`🎬 Processing video: ${sourceVideo.name}`);
            console.log(`   Settings type: ${Array.isArray(settings) ? 'Multiple' : 'Single'}`);
            
            if (Array.isArray(settings)) {
                console.log(`   Watermarks count: ${settings.length}`);
                settings.forEach((s, i) => {
                    console.log(`   Watermark ${i + 1}: ${s.type} - ${s.type === 'text' ? s.text : 'image'}`);
                });
            } else {
                console.log(`   Single watermark: ${settings.type} - ${settings.type === 'text' ? settings.text : 'image'}`);
            }
            
            // For now, we'll simulate video processing
            // In a real implementation, this would use FFmpeg or similar
            const result = await this.simulateVideoProcessing(sourceVideo, settings);

            const outputName = this.generateOutputFilename(sourceVideo.name, Array.isArray(settings) ? settings[0] : settings);

            return {
                id: sourceVideo.id,
                name: outputName,
                originalName: sourceVideo.name,
                url: result.url,
                width: result.width,
                height: result.height,
                duration: result.duration,
                format: result.format,
                size: result.size,
                processedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Error processing video:', error);
            throw error;
        }
    }

    /**
     * Process the entire queue
     */
    async processQueue() {
        if (this.isProcessing) {
            throw new Error('Processing already in progress');
        }

        if (this.processingQueue.length === 0) {
            throw new Error('No videos in queue to process');
        }

        this.isProcessing = true;
        this.shouldStop = false;
        this.results = [];
        this.errors = [];
        
        const startTime = Date.now();
        const totalItems = this.processingQueue.length;
        let processedCount = 0;

        try {
            for (let i = 0; i < this.processingQueue.length; i++) {
                if (this.shouldStop) {
                    console.log('🛑 Video processing stopped by user');
                    break;
                }

                const item = this.processingQueue[i];
                item.status = 'processing';

                try {
                    this.reportProgress(i + 1, totalItems, `Processing ${item.video.name}...`);
                    
                    const result = await this.processVideo(item.video, item.settings);
                    
                    item.result = result;
                    item.status = 'completed';
                    item.progress = 100;
                    this.results.push(result);
                    processedCount++;

                    console.log(`✅ Video processed: ${item.video.name}`);

                } catch (error) {
                    console.error(`❌ Error processing video ${item.video.name}:`, error);
                    item.error = error.message;
                    item.status = 'error';
                    this.errors.push({
                        videoName: item.video.name,
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }

                // Small delay to prevent UI blocking
                await this.delay(100);
            }

            const processingTime = Date.now() - startTime;
            const summary = this.generateProcessingSummary(processingTime);
            
            console.log('📊 Video Processing Summary:', summary);

            if (this.onComplete) {
                this.onComplete({
                    results: this.results,
                    errors: this.errors,
                    summary: summary
                });
            }

        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Stop processing
     */
    stopProcessing() {
        this.shouldStop = true;
        console.log('🛑 Video processing stop requested');
    }

    /**
     * Clear the processing queue
     */
    clearQueue() {
        if (this.isProcessing) {
            throw new Error('Cannot clear queue while processing');
        }
        
        this.processingQueue = [];
        this.results = [];
        this.errors = [];
        console.log('🗑️ Video processing queue cleared');
    }

    /**
     * Get current queue status
     */
    getQueueStatus() {
        const pending = this.processingQueue.filter(item => item.status === 'pending').length;
        const processing = this.processingQueue.filter(item => item.status === 'processing').length;
        const completed = this.processingQueue.filter(item => item.status === 'completed').length;
        const errors = this.processingQueue.filter(item => item.status === 'error').length;

        return {
            total: this.processingQueue.length,
            pending,
            processing,
            completed,
            errors,
            isProcessing: this.isProcessing
        };
    }

    /**
     * Generate processing summary
     */
    generateProcessingSummary(processingTime) {
        const status = this.getQueueStatus();
        
        return {
            totalVideos: status.total,
            successful: status.completed,
            failed: status.errors,
            processingTime: processingTime,
            averageTimePerVideo: status.completed > 0 ? processingTime / status.completed : 0,
            successRate: status.total > 0 ? (status.completed / status.total * 100).toFixed(1) : 0
        };
    }

    /**
     * Create preview batch for videos
     */
    async createPreviewBatch(videos, settings, maxPreviewDuration = 10) {
        try {
            console.log(`🎬 Creating video preview batch for ${videos.length} videos`);
            
            const previews = [];
            
            for (const video of videos) {
                try {
                    // Create a preview version (first 10 seconds or specified duration)
                    const preview = await this.createVideoPreview(video, settings, maxPreviewDuration);
                    previews.push(preview);
                } catch (error) {
                    console.error(`Error creating preview for ${video.name}:`, error);
                    previews.push({
                        name: video.name,
                        error: error.message,
                        isError: true
                    });
                }
            }
            
            return previews;
            
        } catch (error) {
            console.error('Error creating video preview batch:', error);
            throw error;
        }
    }

    /**
     * Create a single video preview
     */
    async createVideoPreview(video, settings, maxDuration = 10) {
        // Simulate creating a video preview
        return {
            name: `preview_${video.name}`,
            originalName: video.name,
            url: video.url, // In real implementation, this would be a processed preview
            duration: Math.min(maxDuration, video.duration || 30),
            width: video.width || 1920,
            height: video.height || 1080,
            isPreview: true,
            watermarkSettings: settings
        };
    }

    /**
     * Simulate video processing (placeholder for real implementation)
     */
    async simulateVideoProcessing(video, settings) {
        // Simulate processing time
        await this.delay(1000 + Math.random() * 2000);
        
        return {
            url: video.url, // In real implementation, this would be the processed video URL
            width: video.width || 1920,
            height: video.height || 1080,
            duration: video.duration || 30,
            format: 'mp4',
            size: video.size || 10485760, // 10MB default
            watermarkApplied: true,
            settings: settings
        };
    }

    /**
     * Validate video watermark settings
     */
    validateVideoSettings(settings) {
        const errors = [];
        
        if (!settings) {
            errors.push('Settings object is required');
            return { isValid: false, errors };
        }
        
        if (!settings.type || !['text', 'image'].includes(settings.type)) {
            errors.push('Valid watermark type (text or image) is required');
        }
        
        if (settings.type === 'text') {
            if (!settings.text || settings.text.trim() === '') {
                errors.push('Text content is required for text watermarks');
            }
            
            if (settings.size && (settings.size < 8 || settings.size > 200)) {
                errors.push('Text size must be between 8 and 200 pixels');
            }
            
            if (settings.opacity && (settings.opacity < 0 || settings.opacity > 100)) {
                errors.push('Opacity must be between 0 and 100');
            }
        }
        
        if (settings.type === 'image') {
            if (!settings.imageUrl && !settings.imageData) {
                errors.push('Image URL or data is required for image watermarks');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Generate output filename for processed video
     */
    generateOutputFilename(originalName, settings) {
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        
        let suffix = 'watermarked';
        if (settings.type === 'text' && settings.text) {
            const textPreview = settings.text.substring(0, 10).replace(/[^a-zA-Z0-9]/g, '');
            suffix = `text-${textPreview}`;
        } else if (settings.type === 'image') {
            suffix = 'logo';
        }
        
        return `${nameWithoutExt}_${suffix}_${timestamp}.mp4`;
    }

    /**
     * Report progress to callback
     */
    reportProgress(current, total, message) {
        const progress = {
            current,
            total,
            percentage: Math.round((current / total) * 100),
            message,
            timestamp: new Date().toISOString()
        };
        
        if (this.onProgress) {
            this.onProgress(progress);
        }
        
        console.log(`📊 Progress: ${progress.percentage}% - ${message}`);
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
        const status = this.getQueueStatus();
        const totalSize = this.results.reduce((sum, result) => sum + (result.size || 0), 0);
        
        return {
            ...status,
            totalOutputSize: totalSize,
            averageFileSize: this.results.length > 0 ? totalSize / this.results.length : 0,
            processingErrors: this.errors
        };
    }

    /**
     * Estimate processing time for queue
     */
    estimateProcessingTime() {
        const averageTimePerVideo = 5000; // 5 seconds average
        const queueLength = this.processingQueue.filter(item => item.status === 'pending').length;
        
        return {
            estimatedTimeMs: queueLength * averageTimePerVideo,
            estimatedTimeFormatted: this.formatDuration(queueLength * averageTimePerVideo)
        };
    }

    /**
     * Format duration in milliseconds to readable string
     */
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
}