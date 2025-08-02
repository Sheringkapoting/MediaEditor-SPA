/**
 * ImageProcessor - Handles image loading, processing, and manipulation
 * with comprehensive error handling and optimization
 */

class ImageProcessor {
    constructor() {
        this.supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    /**
     * Load image from file with comprehensive validation
     */
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            try {
                // Validate file type
                if (!this.supportedFormats.includes(file.type)) {
                    throw new Error(`Unsupported file format: ${file.type}. Supported formats: JPG, PNG, WebP, BMP, TIFF`);
                }

                // Validate file size
                if (file.size > this.maxFileSize) {
                    throw new Error(`File too large: ${this.formatFileSize(file.size)}. Maximum size: ${this.formatFileSize(this.maxFileSize)}`);
                }

                const reader = new FileReader();
                
                reader.onload = (e) => {
                    const img = new Image();
                    
                    img.onload = () => {
                        try {
                            // Validate image dimensions
                            if (img.width > 8000 || img.height > 8000) {
                                throw new Error(`Image dimensions too large: ${img.width}×${img.height}. Maximum: 8000×8000`);
                            }

                            if (img.width < 1 || img.height < 1) {
                                throw new Error('Invalid image dimensions');
                            }

                            const imageData = {
                                src: e.target.result,
                                width: img.width,
                                height: img.height,
                                element: img,
                                file: file,
                                type: file.type,
                                size: file.size
                            };

                            resolve(imageData);
                        } catch (error) {
                            reject(new Error(`Image validation failed: ${error.message}`));
                        }
                    };

                    img.onerror = () => {
                        reject(new Error(`Failed to load image: ${file.name}. The file may be corrupted.`));
                    };

                    img.src = e.target.result;
                };

                reader.onerror = () => {
                    reject(new Error(`Failed to read file: ${file.name}`));
                };

                reader.readAsDataURL(file);

            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Create thumbnail with proper aspect ratio
     */
    async createThumbnail(imageData, maxWidth = 150, maxHeight = 150) {
        try {
            const { element: img } = imageData;
            
            // Calculate thumbnail dimensions
            const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
            const thumbWidth = Math.round(img.width * scale);
            const thumbHeight = Math.round(img.height * scale);

            // Create thumbnail canvas
            const thumbCanvas = document.createElement('canvas');
            const thumbCtx = thumbCanvas.getContext('2d');
            
            thumbCanvas.width = thumbWidth;
            thumbCanvas.height = thumbHeight;

            // Enable image smoothing for better quality
            thumbCtx.imageSmoothingEnabled = true;
            thumbCtx.imageSmoothingQuality = 'high';

            // Draw thumbnail
            thumbCtx.drawImage(img, 0, 0, thumbWidth, thumbHeight);

            return thumbCanvas.toDataURL('image/jpeg', 0.8);

        } catch (error) {
            console.error('Error creating thumbnail:', error);
            throw new Error(`Failed to create thumbnail: ${error.message}`);
        }
    }

    /**
     * Resize image with quality preservation
     */
    async resizeImage(imageData, newWidth, newHeight, maintainAspect = true) {
        try {
            const { element: img } = imageData;
            
            let targetWidth = newWidth;
            let targetHeight = newHeight;

            if (maintainAspect) {
                const aspectRatio = img.width / img.height;
                if (newWidth / newHeight > aspectRatio) {
                    targetWidth = newHeight * aspectRatio;
                } else {
                    targetHeight = newWidth / aspectRatio;
                }
            }

            // Validate target dimensions
            if (targetWidth < 1 || targetHeight < 1) {
                throw new Error('Invalid target dimensions');
            }

            if (targetWidth > 8000 || targetHeight > 8000) {
                throw new Error('Target dimensions too large (max 8000×8000)');
            }

            this.canvas.width = targetWidth;
            this.canvas.height = targetHeight;

            // High quality scaling
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            return {
                canvas: this.canvas,
                width: targetWidth,
                height: targetHeight,
                dataUrl: this.canvas.toDataURL('image/png')
            };

        } catch (error) {
            console.error('Error resizing image:', error);
            throw new Error(`Failed to resize image: ${error.message}`);
        }
    }

    /**
     * Convert image to different format
     */
    async convertFormat(imageData, targetFormat, quality = 0.95) {
        try {
            const { element: img } = imageData;
            
            // Validate format
            const validFormats = ['image/jpeg', 'image/png', 'image/webp'];
            if (!validFormats.includes(targetFormat)) {
                throw new Error(`Unsupported target format: ${targetFormat}`);
            }

            this.canvas.width = img.width;
            this.canvas.height = img.height;

            // Handle transparency for JPEG
            if (targetFormat === 'image/jpeg') {
                this.ctx.fillStyle = '#FFFFFF';
                this.ctx.fillRect(0, 0, img.width, img.height);
            }

            this.ctx.drawImage(img, 0, 0);

            return {
                canvas: this.canvas,
                dataUrl: this.canvas.toDataURL(targetFormat, quality),
                format: targetFormat
            };

        } catch (error) {
            console.error('Error converting format:', error);
            throw new Error(`Failed to convert image format: ${error.message}`);
        }
    }

    /**
     * Get image metadata
     */
    getImageInfo(imageData) {
        try {
            const { file, width, height, type } = imageData;
            
            return {
                name: file.name,
                size: file.size,
                type: type,
                width: width,
                height: height,
                aspectRatio: width / height,
                megapixels: (width * height) / 1000000,
                formattedSize: this.formatFileSize(file.size),
                lastModified: new Date(file.lastModified)
            };

        } catch (error) {
            console.error('Error getting image info:', error);
            return null;
        }
    }

    /**
     * Optimize image for web
     */
    async optimizeForWeb(imageData, maxWidth = 1920, quality = 0.85) {
        try {
            const { element: img } = imageData;
            
            let targetWidth = img.width;
            let targetHeight = img.height;

            // Resize if too large
            if (img.width > maxWidth) {
                const scale = maxWidth / img.width;
                targetWidth = maxWidth;
                targetHeight = Math.round(img.height * scale);
            }

            this.canvas.width = targetWidth;
            this.canvas.height = targetHeight;

            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';

            this.ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            return {
                canvas: this.canvas,
                dataUrl: this.canvas.toDataURL('image/jpeg', quality),
                width: targetWidth,
                height: targetHeight,
                originalSize: imageData.size,
                optimizedSize: this.estimateFileSize(this.canvas.toDataURL('image/jpeg', quality))
            };

        } catch (error) {
            console.error('Error optimizing image:', error);
            throw new Error(`Failed to optimize image: ${error.message}`);
        }
    }

    /**
     * Estimate file size from data URL
     */
    estimateFileSize(dataUrl) {
        try {
            const base64 = dataUrl.split(',')[1];
            const padding = (base64.match(/=/g) || []).length;
            return Math.round((base64.length * 0.75) - padding);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Format file size for display
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate image quality
     */
    validateImageQuality(imageData) {
        try {
            const { width, height, size } = imageData;
            const warnings = [];

            // Check resolution
            if (width < 300 || height < 300) {
                warnings.push('Low resolution image may result in poor quality watermarks');
            }

            // Check file size vs dimensions ratio
            const expectedSize = width * height * 3; // Rough estimate
            if (size < expectedSize * 0.1) {
                warnings.push('Highly compressed image may have artifacts');
            }

            // Check aspect ratio extremes
            const aspectRatio = width / height;
            if (aspectRatio > 10 || aspectRatio < 0.1) {
                warnings.push('Extreme aspect ratio may affect watermark placement');
            }

            return {
                isValid: warnings.length === 0,
                warnings: warnings
            };

        } catch (error) {
            return {
                isValid: false,
                warnings: ['Unable to validate image quality']
            };
        }
    }

    /**
     * Cleanup resources
     */
    dispose() {
        if (this.canvas) {
            this.canvas.width = 1;
            this.canvas.height = 1;
            this.ctx.clearRect(0, 0, 1, 1);
        }
    }
}
