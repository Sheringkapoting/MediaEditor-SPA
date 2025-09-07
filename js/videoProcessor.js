/**
 * VideoProcessor - Handles video loading, validation, and processing operations
 * Provides video-specific functionality similar to ImageProcessor for images
 */

class VideoProcessor {
    constructor() {
        this.supportedFormats = ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
        this.maxFileSize = 500 * 1024 * 1024; // 500MB max file size
        this.maxDuration = 3600; // 1 hour max duration
        this.loadedVideos = new Map();
        this.videoCache = new Map();
        this.processingQueue = [];
    }

    /**
     * Load and validate a video file
     */
    async loadVideo(file) {
        try {
            console.log(`🎬 Loading video: ${file.name} (${this.formatFileSize(file.size)})`);
            
            // Validate file
            const validation = this.validateVideoFile(file);
            if (!validation.isValid) {
                throw new Error(`Invalid video file: ${validation.errors.join(', ')}`);
            }

            // Create video element for processing
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.muted = true;
            
            const videoData = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Video loading timeout'));
                }, 30000); // 30 second timeout

                video.onloadedmetadata = () => {
                    clearTimeout(timeout);
                    
                    const data = {
                        id: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        name: file.name,
                        file: file,
                        url: URL.createObjectURL(file),
                        width: video.videoWidth,
                        height: video.videoHeight,
                        duration: video.duration,
                        size: file.size,
                        type: file.type,
                        format: this.getVideoFormat(file.name),
                        aspectRatio: video.videoWidth / video.videoHeight,
                        loadedAt: new Date().toISOString(),
                        element: video
                    };
                    
                    resolve(data);
                };

                video.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error(`Failed to load video: ${file.name}`));
                };

                video.src = URL.createObjectURL(file);
            });

            // Cache the loaded video
            this.loadedVideos.set(videoData.id, videoData);
            
            console.log(`✅ Video loaded successfully:`);
            console.log(`   Dimensions: ${videoData.width}x${videoData.height}`);
            console.log(`   Duration: ${this.formatDuration(videoData.duration)}`);
            console.log(`   Format: ${videoData.format}`);
            console.log(`   Aspect Ratio: ${videoData.aspectRatio.toFixed(2)}`);
            
            return videoData;

        } catch (error) {
            console.error('Error loading video:', error);
            throw error;
        }
    }

    /**
     * Load multiple videos
     */
    async loadMultipleVideos(files, onProgress = null) {
        const results = [];
        const errors = [];
        
        console.log(`🎬 Loading ${files.length} videos...`);
        
        for (let i = 0; i < files.length; i++) {
            try {
                if (onProgress) {
                    onProgress({
                        current: i + 1,
                        total: files.length,
                        percentage: Math.round(((i + 1) / files.length) * 100),
                        fileName: files[i].name
                    });
                }
                
                const videoData = await this.loadVideo(files[i]);
                results.push(videoData);
                
            } catch (error) {
                console.error(`Failed to load video ${files[i].name}:`, error);
                errors.push({
                    fileName: files[i].name,
                    error: error.message
                });
            }
        }
        
        console.log(`📊 Video loading complete: ${results.length} successful, ${errors.length} failed`);
        
        return {
            successful: results,
            errors: errors,
            totalLoaded: results.length,
            totalFailed: errors.length
        };
    }

    /**
     * Validate video file
     */
    validateVideoFile(file) {
        const errors = [];
        
        if (!file) {
            errors.push('No file provided');
            return { isValid: false, errors };
        }
        
        // Check file type
        if (!file.type.startsWith('video/')) {
            errors.push('File is not a video');
        }
        
        // Check file size
        if (file.size > this.maxFileSize) {
            errors.push(`File size (${this.formatFileSize(file.size)}) exceeds maximum allowed size (${this.formatFileSize(this.maxFileSize)})`);
        }
        
        if (file.size === 0) {
            errors.push('File is empty');
        }
        
        // Check file extension
        const extension = this.getVideoFormat(file.name);
        if (!this.supportedFormats.includes(extension)) {
            errors.push(`Unsupported video format: ${extension}. Supported formats: ${this.supportedFormats.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Get video format from filename
     */
    getVideoFormat(filename) {
        const extension = filename.toLowerCase().split('.').pop();
        return extension || 'unknown';
    }

    /**
     * Create video thumbnail/poster
     */
    async createVideoThumbnail(videoData, timePosition = 1) {
        try {
            const video = videoData.element;
            
            // Seek to specified time position
            video.currentTime = Math.min(timePosition, video.duration * 0.1); // 10% into video or 1 second
            
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Thumbnail generation timeout'));
                }, 10000);

                video.onseeked = () => {
                    clearTimeout(timeout);
                    
                    try {
                        // Create canvas to capture frame
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        
                        // Draw current frame
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        
                        // Convert to blob
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve({
                                    blob: blob,
                                    url: URL.createObjectURL(blob),
                                    width: canvas.width,
                                    height: canvas.height,
                                    timePosition: video.currentTime
                                });
                            } else {
                                reject(new Error('Failed to create thumbnail blob'));
                            }
                        }, 'image/jpeg', 0.8);
                        
                    } catch (error) {
                        clearTimeout(timeout);
                        reject(error);
                    }
                };
                
                video.onerror = () => {
                    clearTimeout(timeout);
                    reject(new Error('Video seek error'));
                };
            });
            
        } catch (error) {
            console.error('Error creating video thumbnail:', error);
            throw error;
        }
    }

    /**
     * Get video information
     */
    getVideoInfo(videoData) {
        const video = videoData.element;
        
        return {
            id: videoData.id,
            name: videoData.name,
            dimensions: {
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: video.videoWidth / video.videoHeight
            },
            duration: {
                seconds: video.duration,
                formatted: this.formatDuration(video.duration)
            },
            file: {
                size: videoData.size,
                sizeFormatted: this.formatFileSize(videoData.size),
                type: videoData.type,
                format: videoData.format
            },
            technical: {
                hasAudio: video.mozHasAudio !== false, // Firefox specific, fallback to true
                readyState: video.readyState,
                networkState: video.networkState,
                currentTime: video.currentTime,
                buffered: video.buffered.length > 0 ? {
                    start: video.buffered.start(0),
                    end: video.buffered.end(video.buffered.length - 1)
                } : null
            },
            metadata: {
                loadedAt: videoData.loadedAt,
                url: videoData.url
            }
        };
    }

    /**
     * Resize video (conceptual - for watermark positioning)
     */
    calculateVideoResize(originalWidth, originalHeight, maxWidth, maxHeight, maintainAspectRatio = true) {
        if (!maintainAspectRatio) {
            return {
                width: maxWidth,
                height: maxHeight,
                scaleX: maxWidth / originalWidth,
                scaleY: maxHeight / originalHeight
            };
        }
        
        const aspectRatio = originalWidth / originalHeight;
        let newWidth = maxWidth;
        let newHeight = maxHeight;
        
        if (maxWidth / maxHeight > aspectRatio) {
            newWidth = maxHeight * aspectRatio;
        } else {
            newHeight = maxWidth / aspectRatio;
        }
        
        return {
            width: Math.round(newWidth),
            height: Math.round(newHeight),
            scaleX: newWidth / originalWidth,
            scaleY: newHeight / originalHeight,
            aspectRatio: aspectRatio
        };
    }

    /**
     * Validate video dimensions for processing
     */
    validateVideoDimensions(videoData, requirements = {}) {
        const {
            minWidth = 100,
            minHeight = 100,
            maxWidth = 7680, // 8K width
            maxHeight = 4320, // 8K height
            allowedAspectRatios = null
        } = requirements;
        
        const errors = [];
        const video = videoData.element;
        
        if (video.videoWidth < minWidth) {
            errors.push(`Video width (${video.videoWidth}px) is below minimum (${minWidth}px)`);
        }
        
        if (video.videoHeight < minHeight) {
            errors.push(`Video height (${video.videoHeight}px) is below minimum (${minHeight}px)`);
        }
        
        if (video.videoWidth > maxWidth) {
            errors.push(`Video width (${video.videoWidth}px) exceeds maximum (${maxWidth}px)`);
        }
        
        if (video.videoHeight > maxHeight) {
            errors.push(`Video height (${video.videoHeight}px) exceeds maximum (${maxHeight}px)`);
        }
        
        if (allowedAspectRatios && Array.isArray(allowedAspectRatios)) {
            const aspectRatio = video.videoWidth / video.videoHeight;
            const tolerance = 0.1;
            const isValidAspectRatio = allowedAspectRatios.some(ratio => 
                Math.abs(aspectRatio - ratio) <= tolerance
            );
            
            if (!isValidAspectRatio) {
                errors.push(`Video aspect ratio (${aspectRatio.toFixed(2)}) is not in allowed ratios: ${allowedAspectRatios.join(', ')}`);
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            dimensions: {
                width: video.videoWidth,
                height: video.videoHeight,
                aspectRatio: video.videoWidth / video.videoHeight
            }
        };
    }

    /**
     * Clean up video resources
     */
    cleanup(videoId = null) {
        if (videoId) {
            const videoData = this.loadedVideos.get(videoId);
            if (videoData) {
                if (videoData.url) {
                    URL.revokeObjectURL(videoData.url);
                }
                if (videoData.element) {
                    videoData.element.src = '';
                    videoData.element.load();
                }
                this.loadedVideos.delete(videoId);
                console.log(`🗑️ Cleaned up video: ${videoData.name}`);
            }
        } else {
            // Clean up all videos
            for (const [id, videoData] of this.loadedVideos) {
                if (videoData.url) {
                    URL.revokeObjectURL(videoData.url);
                }
                if (videoData.element) {
                    videoData.element.src = '';
                    videoData.element.load();
                }
            }
            this.loadedVideos.clear();
            console.log('🗑️ Cleaned up all videos');
        }
    }

    /**
     * Get loaded video by ID
     */
    getLoadedVideo(videoId) {
        return this.loadedVideos.get(videoId);
    }

    /**
     * Get all loaded videos
     */
    getAllLoadedVideos() {
        return Array.from(this.loadedVideos.values());
    }

    /**
     * Check if video is loaded
     */
    isVideoLoaded(videoId) {
        return this.loadedVideos.has(videoId);
    }

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format duration in seconds to readable string
     */
    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    /**
     * Get processing statistics
     */
    getStatistics() {
        const videos = Array.from(this.loadedVideos.values());
        const totalSize = videos.reduce((sum, video) => sum + video.size, 0);
        const totalDuration = videos.reduce((sum, video) => sum + (video.duration || 0), 0);
        
        return {
            totalVideos: videos.length,
            totalSize: totalSize,
            totalSizeFormatted: this.formatFileSize(totalSize),
            totalDuration: totalDuration,
            totalDurationFormatted: this.formatDuration(totalDuration),
            averageFileSize: videos.length > 0 ? totalSize / videos.length : 0,
            averageDuration: videos.length > 0 ? totalDuration / videos.length : 0,
            formats: [...new Set(videos.map(v => v.format))],
            resolutions: [...new Set(videos.map(v => `${v.width}x${v.height}`))]
        };
    }

    /**
     * Export video data for processing
     */
    exportVideoData(videoId) {
        const videoData = this.loadedVideos.get(videoId);
        if (!videoData) {
            throw new Error(`Video not found: ${videoId}`);
        }
        
        return {
            id: videoData.id,
            name: videoData.name,
            url: videoData.url,
            width: videoData.width,
            height: videoData.height,
            duration: videoData.duration,
            size: videoData.size,
            format: videoData.format,
            aspectRatio: videoData.aspectRatio,
            file: videoData.file
        };
    }

    /**
     * Create video processing context
     */
    createProcessingContext(videoData, settings = {}) {
        return {
            video: this.exportVideoData(videoData.id),
            settings: {
                quality: settings.quality || 'high',
                format: settings.format || 'mp4',
                compression: settings.compression || 'medium',
                watermark: settings.watermark || null,
                ...settings
            },
            timestamp: new Date().toISOString(),
            processingId: `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
    }
}