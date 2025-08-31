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
     * Applies a text watermark with proper scaling and anti-aliasing.
     */
    async applyTextWatermark(ctx, settings, bounds, scaleFactor = 1) {
        try {
            const { text, transform } = settings; // Use the dynamic transform object
            
            ctx.save();
            
            // CRITICAL FIX: Scale transform coordinates from preview to actual image dimensions
            let actualTransform = transform;
            if (transform && transform.previewCanvasWidth && transform.previewCanvasHeight) {
                const scaleX = bounds.width / transform.previewCanvasWidth;
                const scaleY = bounds.height / transform.previewCanvasHeight;
                
                actualTransform = {
                    x: transform.x * scaleX,
                    y: transform.y * scaleY,
                    width: transform.width * scaleX,
                    height: transform.height * scaleY,
                    rotation: transform.rotation
                };
                
                console.log(`📏 Scaling text watermark: preview ${transform.previewCanvasWidth}x${transform.previewCanvasHeight} -> actual ${bounds.width}x${bounds.height}`);
                console.log(`   Transform: (${transform.x},${transform.y},${transform.width}x${transform.height}) -> (${actualTransform.x},${actualTransform.y},${actualTransform.width}x${actualTransform.height})`);
            }
            
            // Use the dynamically calculated font size and transform
            const fontSize = text.size * scaleFactor;
            ctx.font = `${fontSize}px "${text.font}"`;
            ctx.fillStyle = text.color;
            ctx.globalAlpha = text.opacity / 100;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerX = actualTransform.x + actualTransform.width / 2;
            const centerY = actualTransform.y + actualTransform.height / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(actualTransform.rotation * Math.PI / 180);
            
            // Ensure text is rendered without blur
            ctx.imageSmoothingEnabled = true;
            
            ctx.fillText(text.content, 0, 0);
            
            ctx.restore();
        } catch (error) {
            console.error('Error applying text watermark:', error);
        }
    }

    /**
     * Applies an image watermark maintaining aspect ratio and sharpness.
     */
    async applyImageWatermark(ctx, settings, bounds, scaleFactor = 1) {
        try {
            const { image, position, transform } = settings;
            if (!image.imageData) return;
            
            const img = new Image();
            img.src = image.imageData;
            
            await new Promise(resolve => img.onload = resolve);
            
            ctx.save();
            
            // CRITICAL FIX: Use transform object if available (for consistency with text watermarks)
            if (transform) {
                // Scale transform coordinates from preview to actual image dimensions
                let actualTransform = transform;
                if (transform.previewCanvasWidth && transform.previewCanvasHeight) {
                    const scaleX = bounds.width / transform.previewCanvasWidth;
                    const scaleY = bounds.height / transform.previewCanvasHeight;
                    
                    actualTransform = {
                        x: transform.x * scaleX,
                        y: transform.y * scaleY,
                        width: transform.width * scaleX,
                        height: transform.height * scaleY,
                        rotation: transform.rotation
                    };
                    
                    console.log(`📏 Scaling image watermark: preview ${transform.previewCanvasWidth}x${transform.previewCanvasHeight} -> actual ${bounds.width}x${bounds.height}`);
                    console.log(`   Transform: (${transform.x},${transform.y},${transform.width}x${transform.height}) -> (${actualTransform.x},${actualTransform.y},${actualTransform.width}x${actualTransform.height})`);
                }
                
                // Use transform-based positioning (same as text watermarks)
                const centerX = actualTransform.x + actualTransform.width / 2;
                const centerY = actualTransform.y + actualTransform.height / 2;
                
                ctx.translate(centerX, centerY);
                ctx.rotate((actualTransform.rotation || 0) * Math.PI / 180);
                
                ctx.globalAlpha = image.opacity / 100;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                // Draw image centered at origin (after translation)
                ctx.drawImage(img, -actualTransform.width / 2, -actualTransform.height / 2, actualTransform.width, actualTransform.height);
            } else {
                // Fallback to position-based calculation (legacy mode)
                const originalWidth = img.naturalWidth || img.width;
                const originalHeight = img.naturalHeight || img.height;
                const scale = (image.scale || 100) / 100 * scaleFactor;
                
                const watermarkWidth = originalWidth * scale;
                const watermarkHeight = originalHeight * scale;
                
                // Calculate position
                const pos = this.calculatePosition(position, bounds, {
                    width: watermarkWidth,
                    height: watermarkHeight
                }, false, scaleFactor);
                
                // Apply rotation if specified
                const rotation = image.rotation || 0;
                if (rotation !== 0) {
                    const centerX = pos.x + watermarkWidth / 2;
                    const centerY = pos.y + watermarkHeight / 2;
                    ctx.translate(centerX, centerY);
                    ctx.rotate(rotation * Math.PI / 180);
                    ctx.translate(-centerX, -centerY);
                }
                
                ctx.globalAlpha = image.opacity / 100;
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                
                ctx.drawImage(img, pos.x, pos.y, watermarkWidth, watermarkHeight);
            }

            ctx.restore();
        } catch (error) {
            console.error('Error applying image watermark:', error);
            throw error;
        }
    }

    /**
     * Calculate watermark position with proper scaling
     */
    calculatePosition(positionSettings, bounds, watermarkSize, isPreview = false, scaleFactor = 1) {
        try {
            const { preset, x: offsetX = 0, y: offsetY = 0 } = positionSettings || {};
            const { x: boundsX, y: boundsY, width: boundsWidth, height: boundsHeight } = bounds;
            const { width: wmWidth, height: wmHeight } = watermarkSize;

            // Scaled dimensions/offsets for preset-based positioning
            const scaledWmWidth = wmWidth * scaleFactor;
            const scaledWmHeight = wmHeight * scaleFactor;
            const scaledOffsetX = offsetX * scaleFactor;
            const scaledOffsetY = offsetY * scaleFactor;

            // Custom normalized positioning (center-based coordinates)
            // If preset === 'custom', treat offsetX/offsetY as normalized center (0..1000)
            if (preset === 'custom') {
                const nx = Math.max(0, Math.min(1, (offsetX || 0) / 1000));
                const ny = Math.max(0, Math.min(1, (offsetY || 0) / 1000));
                
                // Calculate center position, then convert to top-left
                const centerX = boundsX + boundsWidth * nx;
                const centerY = boundsY + boundsHeight * ny;
                
                return {
                    x: centerX - scaledWmWidth / 2,
                    y: centerY - scaledWmHeight / 2,
                    scaleFactor
                };
            }

            let baseX, baseY;
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

            return {
                x: baseX + scaledOffsetX,
                y: baseY + scaledOffsetY,
                scaleFactor
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

            const scale = Math.min(maxSize / img.width, maxSize / img.height);
            const previewWidth = Math.round(img.width * scale);
            const previewHeight = Math.round(img.height * scale);

            this.tempCanvas.width = previewWidth;
            this.tempCanvas.height = previewHeight;

            this.tempCtx.clearRect(0, 0, previewWidth, previewHeight);
            this.tempCtx.drawImage(img, 0, 0, previewWidth, previewHeight);

            const bounds = { x: 0, y: 0, width: previewWidth, height: previewHeight };

            // IMPORTANT: pass preview scale so size/position match the final output visually
            await this.applyWatermark(this.tempCtx, settings, bounds, scale);

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

            // Draw in array order (assumed bottom -> top already defined by caller)
            for (const wm of watermarks) {
                await this.applyWatermark(this.tempCtx, wm, bounds, scale);
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

    async generateWatermarkedImageMultiple(sourceImageData, watermarks) {
        try {
            const { element: img } = sourceImageData;

            // Full-resolution canvas
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.clearRect(0, 0, img.width, img.height);
            this.ctx.drawImage(img, 0, 0);

            const bounds = { x: 0, y: 0, width: img.width, height: img.height };

            // Apply all watermarks in order
            console.log(`🎨 Applying ${watermarks.length} watermarks to image ${img.width}x${img.height}`);
            for (let i = 0; i < watermarks.length; i++) {
                const wm = watermarks[i];
                console.log(`  Watermark ${i + 1}: ${wm.type} - ${wm.type === 'text' ? wm.text.content : 'image'}`);
                await this.applyWatermark(this.ctx, wm, bounds, 1);
            }
            console.log(`✅ Applied all ${watermarks.length} watermarks`);

            // Use the first watermark's output settings (they should all match)
            const first = watermarks[0] || {};
            const out = (first.output && first.output.format) || 'png';
            const qual = (first.output && first.output.quality) || 95;

            const format = out === 'jpeg' ? 'image/jpeg' : out === 'webp' ? 'image/webp' : 'image/png';
            const quality = Math.max(0, Math.min(1, qual / 100));

            return {
                canvas: this.canvas,
                dataUrl: this.canvas.toDataURL(format, quality),
                width: img.width,
                height: img.height,
                format
            };
        } catch (error) {
            console.error('Error generating multi watermarked image:', error);
            throw new Error(`Failed to generate watermarked image: ${error.message}`);
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
                'bottom-left', 'bottom-center', 'bottom-right',
                'custom'  // Allow custom positioning
            ];
            if (!validPositions.includes(settings.position.preset)) {
                errors.push(`Invalid position preset: ${settings.position.preset}`);
            }
            
            // Validate custom position coordinates
            if (settings.position.preset === 'custom') {
                if (typeof settings.position.x !== 'number' || typeof settings.position.y !== 'number') {
                    errors.push('Custom position requires valid x and y coordinates');
                }
                if (settings.position.x < 0 || settings.position.x > 1000 || 
                    settings.position.y < 0 || settings.position.y > 1000) {
                    errors.push('Custom position coordinates must be between 0 and 1000');
                }
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
