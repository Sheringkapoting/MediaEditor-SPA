/**
 * WatermarkEngine - Handles watermark application with advanced positioning and effects
 */

class WatermarkEngine {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.tempCanvas = document.createElement('canvas');
        this.tempCtx = this.tempCanvas.getContext('2d');
    }

    /**
     * Main apply watermark method with scale factor
     */
    async applyWatermark(targetCtx, settings, bounds, scaleFactor = 1) {
        try {
            const { type } = settings;
            
            targetCtx.save();

            switch (type) {
                case 'text':
                    await this.applyTextWatermark(targetCtx, settings, bounds, scaleFactor);
                    break;
                case 'image':
                    await this.applyImageWatermark(targetCtx, settings, bounds, scaleFactor);
                    break;
                case 'combined':
                    await this.applyTextWatermark(targetCtx, settings, bounds, scaleFactor);
                    await this.applyImageWatermark(targetCtx, settings, bounds, scaleFactor);
                    break;
                default:
                    throw new Error(`Unknown watermark type: ${type}`);
            }

            targetCtx.restore();

        } catch (error) {
            console.error('Error applying watermark:', error);
            throw new Error(`Failed to apply watermark: ${error.message}`);
        }
    }

    /**
     * Apply multiple watermarks sequentially
     * @param {CanvasRenderingContext2D} targetCtx - Target canvas context
     * @param {Array} watermarks - Array of watermark settings
     * @param {Object} bounds - Drawing bounds
     * @param {number} scaleFactor - Scale factor for positioning
     */
    async applyWatermarks(targetCtx, watermarks, bounds, scaleFactor = 1) {
        for (const wm of watermarks) {
            await this.applyWatermark(targetCtx, wm, bounds, scaleFactor);
        }
    }

    /**
     * Apply text watermark with proper scaling
     */
    async applyTextWatermark(ctx, settings, bounds, scaleFactor = 1) {
        try {
            const { text, position } = settings;
            
            if (!text.content || text.content.trim() === '') {
                return;
            }

            // Calculate scaled text size
            const scaledTextSize = text.size * scaleFactor;
            
            // Estimate text dimensions with scaling
            const textWidth = this.estimateTextWidth({
                ...text,
                size: scaledTextSize
            });
            
            // Calculate position with scale factor
            const pos = this.calculatePosition(position, bounds, {
                width: textWidth,
                height: scaledTextSize
            }, false, scaleFactor);

            // Apply transformations
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            if (text.rotation !== 0) {
                ctx.rotate((text.rotation * Math.PI) / 180);
            }

            // Set text properties with scaling
            ctx.font = `${scaledTextSize}px ${text.font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = text.opacity / 100;

            // Create text with stroke for better visibility
            if (this.needsStroke(text.color)) {
                ctx.strokeStyle = this.getContrastColor(text.color);
                ctx.lineWidth = Math.max(1, scaledTextSize / 20);
                ctx.strokeText(text.content, 0, 0);
            }

            // Fill text
            ctx.fillStyle = text.color;
            ctx.fillText(text.content, 0, 0);

            ctx.restore();

        } catch (error) {
            console.error('Error applying text watermark:', error);
            throw new Error(`Failed to apply text watermark: ${error.message}`);
        }
    }

    /**
     * Apply image watermark with proper scaling
     */
    async applyImageWatermark(ctx, settings, bounds, scaleFactor = 1) {
        try {
            const { image } = settings;
            
            if (!image.imageData || !image.imageData.element) {
                return;
            }

            const img = image.imageData.element;
            
            // Calculate scaled dimensions
            const scale = (image.scale / 100) * scaleFactor;
            const scaledWidth = img.width * scale;
            const scaledHeight = img.height * scale;

            // Calculate position with scale factor
            const pos = this.calculatePosition(settings.position, bounds, {
                width: scaledWidth,
                height: scaledHeight
            }, false, scaleFactor);

            // Apply transformations
            ctx.save();
            ctx.translate(pos.x, pos.y);
            
            if (image.rotation !== 0) {
                ctx.rotate((image.rotation * Math.PI) / 180);
            }

            ctx.globalAlpha = image.opacity / 100;

            // Draw image centered at origin
            ctx.drawImage(
                img,
                -scaledWidth / 2,
                -scaledHeight / 2,
                scaledWidth,
                scaledHeight
            );

            ctx.restore();

        } catch (error) {
            console.error('Error applying image watermark:', error);
            throw new Error(`Failed to apply image watermark: ${error.message}`);
        }
    }

    /**
     * Calculate watermark position with proper scaling
     */
    calculatePosition(positionSettings, bounds, watermarkSize, isPreview = false, scaleFactor = 1) {
        try {
            const { preset, x: offsetX, y: offsetY } = positionSettings;
            const { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight } = bounds;
            const { width: wmWidth, height: wmHeight } = watermarkSize;

            // Apply scale factor for consistent positioning
            const scaledOffsetX = offsetX * scaleFactor;
            const scaledOffsetY = offsetY * scaleFactor;
            const scaledWmWidth = wmWidth * scaleFactor;
            const scaledWmHeight = wmHeight * scaleFactor;

            let baseX, baseY;

            // Calculate base position based on preset
            switch (preset) {
                case 'top-left':
                    baseX = boundsX + scaledWmWidth / 2;
                    baseY = boundsY + scaledWmHeight / 2;
                    break;
                case 'top-center':
                    baseX = boundsX + boundsWidth / 2;
                    baseY = boundsY + scaledWmHeight / 2;
                    break;
                case 'top-right':
                    baseX = boundsX + boundsWidth - scaledWmWidth / 2;
                    baseY = boundsY + scaledWmHeight / 2;
                    break;
                case 'center-left':
                    baseX = boundsX + scaledWmWidth / 2;
                    baseY = boundsY + boundsHeight / 2;
                    break;
                case 'center':
                    baseX = boundsX + boundsWidth / 2;
                    baseY = boundsY + boundsHeight / 2;
                    break;
                case 'center-right':
                    baseX = boundsX + boundsWidth - scaledWmWidth / 2;
                    baseY = boundsY + boundsHeight / 2;
                    break;
                case 'bottom-left':
                    baseX = boundsX + scaledWmWidth / 2;
                    baseY = boundsY + boundsHeight - scaledWmHeight / 2;
                    break;
                case 'bottom-center':
                    baseX = boundsX + boundsWidth / 2;
                    baseY = boundsY + boundsHeight - scaledWmHeight / 2;
                    break;
                case 'bottom-right':
                    baseX = boundsX + boundsWidth - scaledWmWidth / 2;
                    baseY = boundsY + boundsHeight - scaledWmHeight / 2;
                    break;
                default:
                    baseX = boundsX + boundsWidth / 2;
                    baseY = boundsY + boundsHeight / 2;
            }

            // Apply offsets with proper scaling
            return {
                x: baseX + scaledOffsetX,
                y: baseY + scaledOffsetY,
                scaleFactor: scaleFactor
            };

        } catch (error) {
            console.error('Error calculating position:', error);
            return {
                x: bounds.x + bounds.width / 2,
                y: bounds.y + bounds.height / 2,
                scaleFactor: 1
            };
        }
    }

    /**
     * Estimate text width for positioning with proper scaling
     */
    estimateTextWidth(textSettings) {
        try {
            // Create temporary canvas for measurement
            this.tempCanvas.width = 2000; // Larger canvas for accurate measurement
            this.tempCanvas.height = 200;
            
            this.tempCtx.font = `${textSettings.size}px ${textSettings.font}`;
            const metrics = this.tempCtx.measureText(textSettings.content);
            
            return metrics.width;

        } catch (error) {
            console.error('Error estimating text width:', error);
            // Fallback estimate
            return textSettings.size * textSettings.content.length * 0.6;
        }
    }

    /**
     * Determine if text needs stroke for visibility
     */
    needsStroke(color) {
        try {
            // Convert color to RGB values
            const rgb = this.hexToRgb(color);
            if (!rgb) return false;

            // Calculate luminance
            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            
            // Light colors need dark stroke, dark colors need light stroke
            return luminance > 0.7 || luminance < 0.3;

        } catch (error) {
            return false;
        }
    }

    /**
     * Get contrast color for stroke
     */
    getContrastColor(color) {
        try {
            const rgb = this.hexToRgb(color);
            if (!rgb) return '#000000';

            const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
            return luminance > 0.5 ? '#000000' : '#FFFFFF';

        } catch (error) {
            return '#000000';
        }
    }

    /**
     * Convert hex color to RGB
     */
    hexToRgb(hex) {
        try {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Generate watermark for full image processing with exact positioning
     */
    async generateWatermarkedImage(sourceImageData, settings) {
        try {
            const { element: img } = sourceImageData;
            
            // Setup canvas for full resolution processing
            this.canvas.width = img.width;
            this.canvas.height = img.height;

            // Clear canvas
            this.ctx.clearRect(0, 0, img.width, img.height);

            // Draw source image
            this.ctx.drawImage(img, 0, 0);

            // Apply watermark at full resolution (scale factor = 1 for original size)
            const bounds = {
                x: 0,
                y: 0,
                width: img.width,
                height: img.height
            };

            // Use scale factor of 1 for final processing (no scaling needed)
            await this.applyWatermark(this.ctx, settings, bounds, 1);

            // Get result
            const format = settings.output.format === 'jpeg' ? 'image/jpeg' : 'image/png';
            const quality = settings.output.quality / 100;

            return {
                canvas: this.canvas,
                dataUrl: this.canvas.toDataURL(format, quality),
                width: img.width,
                height: img.height,
                format: format
            };

        } catch (error) {
            console.error('Error generating watermarked image:', error);
            throw new Error(`Failed to generate watermarked image: ${error.message}`);
        }
    }

    /**
     * Preview watermark on thumbnail
     */
    async generatePreview(sourceImageData, settings, maxSize = 400) {
        try {
            const { element: img } = sourceImageData;
            
            // Calculate preview size
            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const previewWidth = Math.round(img.width * scale);
            const previewHeight = Math.round(img.height * scale);

            // Setup preview canvas
            this.tempCanvas.width = previewWidth;
            this.tempCanvas.height = previewHeight;

            // Draw scaled source image
            this.tempCtx.clearRect(0, 0, previewWidth, previewHeight);
            this.tempCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

            // Apply watermark to preview
            const bounds = {
                x: 0,
                y: 0,
                width: previewWidth,
                height: previewHeight
            };

            await this.applyWatermark(this.tempCtx, settings, bounds);

            return {
                canvas: this.tempCanvas,
                dataUrl: this.tempCanvas.toDataURL('image/png'),
                width: previewWidth,
                height: previewHeight
            };

        } catch (error) {
            console.error('Error generating preview:', error);
            throw new Error(`Failed to generate preview: ${error.message}`);
        }
    }

    /**
     * Generate preview with multiple watermarks
     */
    async generatePreviewMultiple(sourceImageData, watermarks, maxSize = 400) {
        try {
            const { element: img } = sourceImageData;

            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const previewWidth = Math.round(img.width * scale);
            const previewHeight = Math.round(img.height * scale);

            this.tempCanvas.width = previewWidth;
            this.tempCanvas.height = previewHeight;

            this.tempCtx.clearRect(0, 0, previewWidth, previewHeight);
            this.tempCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

            const bounds = { x: 0, y: 0, width: previewWidth, height: previewHeight };

            for (const wm of watermarks) {
                await this.applyWatermark(this.tempCtx, wm, bounds);
            }

            return {
                canvas: this.tempCanvas,
                dataUrl: this.tempCanvas.toDataURL('image/png'),
                width: previewWidth,
                height: previewHeight
            };

        } catch (error) {
            console.error('Error generating multi-preview:', error);
            throw new Error(`Failed to generate preview: ${error.message}`);
        }
    }

    /**
     * Validate watermark settings
     */
    validateSettings(settings) {
        const errors = [];

        try {
            // Validate type
            if (!['text', 'image', 'combined'].includes(settings.type)) {
                errors.push('Invalid watermark type');
            }

            // Validate text settings
            if (settings.type === 'text' || settings.type === 'combined') {
                if (!settings.text.content || settings.text.content.trim() === '') {
                    errors.push('Text content is required');
                }
                if (settings.text.size < 8 || settings.text.size > 500) {
                    errors.push('Text size must be between 8 and 500 pixels');
                }
                if (settings.text.opacity < 0 || settings.text.opacity > 100) {
                    errors.push('Text opacity must be between 0 and 100');
                }
            }

            // Validate image settings
            if (settings.type === 'image' || settings.type === 'combined') {
                if (!settings.image.imageData) {
                    errors.push('Watermark image is required');
                }
                if (settings.image.scale < 1 || settings.image.scale > 500) {
                    errors.push('Image scale must be between 1 and 500 percent');
                }
                if (settings.image.opacity < 0 || settings.image.opacity > 100) {
                    errors.push('Image opacity must be between 0 and 100');
                }
            }

            // Validate position
            const validPositions = [
                'top-left', 'top-center', 'top-right',
                'center-left', 'center', 'center-right',
                'bottom-left', 'bottom-center', 'bottom-right'
            ];
            if (!validPositions.includes(settings.position.preset)) {
                errors.push('Invalid position preset');
            }

            return {
                isValid: errors.length === 0,
                errors: errors
            };

        } catch (error) {
            return {
                isValid: false,
                errors: ['Failed to validate settings']
            };
        }
    }

    /**
     * Get watermark dimensions for layout calculations
     */
    getWatermarkDimensions(settings) {
        try {
            let width = 0, height = 0;

            if (settings.type === 'text' || settings.type === 'combined') {
                width = Math.max(width, this.estimateTextWidth(settings.text));
                height = Math.max(height, settings.text.size);
            }

            if (settings.type === 'image' || settings.type === 'combined') {
                if (settings.image.imageData) {
                    const img = settings.image.imageData;
                    const scale = settings.image.scale / 100;
                    width = Math.max(width, img.width * scale);
                    height = Math.max(height, img.height * scale);
                }
            }

            return { width, height };

        } catch (error) {
            return { width: 100, height: 50 }; // Fallback dimensions
        }
    }
}
