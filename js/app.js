/**
 * WatermarkPro - Professional Batch Image Watermarking Application
 * Main application controller with comprehensive error handling
 */

class WatermarkApp {
    constructor() {
        this.sourceImages = [];
        this.currentImageIndex = -1;
        this.processedImages = [];
        this.watermarkSettings = this.getDefaultSettings();
        this.zoom = 1;
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.canvasOffset = { x: 0, y: 0 };
        
        // Initialize components
        this.imageProcessor = new ImageProcessor();
        this.watermarkEngine = new WatermarkEngine();
        this.batchProcessor = new BatchProcessor();
        this.templateManager = new TemplateManager();
        
        this.initializeApp();
    }

    /**
     * Initialize the application
     */
    async initializeApp() {
        try {
            console.log('Initializing WatermarkPro...');
            
            this.setupEventListeners();
            this.setupDragAndDrop();
            this.setupCanvas();
            this.loadSavedSettings();
            
            // Show welcome message
            this.showNotification('Welcome to WatermarkPro!', 'success');
            
            console.log('WatermarkPro initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize application', error.message);
        }
    }

    /**
     * Get default watermark settings
     */
    getDefaultSettings() {
        return {
            type: 'text',
            text: {
                content: '© WatermarkPro 2025',
                font: 'Arial',
                size: 48,
                color: '#ffffff',
                opacity: 80,
                rotation: 0
            },
            image: {
                file: null,
                scale: 100,
                opacity: 80,
                rotation: 0
            },
            position: {
                preset: 'center',
                x: 0,
                y: 0
            },
            output: {
                format: 'png',
                quality: 95
            }
        };
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        try {
            // File input events
            document.getElementById('sourceInput').addEventListener('change', (e) => {
                this.handleSourceFiles(e.target.files);
            });

            document.getElementById('watermarkInput').addEventListener('change', (e) => {
                this.handleWatermarkFile(e.target.files[0]);
            });

            // Upload area clicks
            document.getElementById('sourceUpload').addEventListener('click', () => {
                document.getElementById('sourceInput').click();
            });

            document.getElementById('watermarkUpload').addEventListener('click', () => {
                document.getElementById('watermarkInput').click();
            });

            // Watermark type tabs
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.switchWatermarkType(e.target.dataset.type);
                });
            });

            // Text settings
            this.setupTextSettingsListeners();

            // Image settings
            this.setupImageSettingsListeners();

            // Position settings
            this.setupPositionListeners();

            // Button events
            document.getElementById('clearSourceBtn').addEventListener('click', () => {
                this.clearSourceImages();
            });

            document.getElementById('previewBatchBtn').addEventListener('click', () => {
                this.previewBatch();
            });

            document.getElementById('processBatchBtn').addEventListener('click', () => {
                this.processBatch();
            });

            document.getElementById('downloadAllBtn').addEventListener('click', () => {
                this.downloadAll();
            });

            // Preview controls
            document.getElementById('zoomInBtn').addEventListener('click', () => {
                this.zoomIn();
            });

            document.getElementById('zoomOutBtn').addEventListener('click', () => {
                this.zoomOut();
            });

            document.getElementById('fitToScreenBtn').addEventListener('click', () => {
                this.fitToScreen();
            });

            // Template management
            document.getElementById('saveTemplateBtn').addEventListener('click', () => {
                this.saveTemplate();
            });

            document.getElementById('loadTemplateBtn').addEventListener('click', () => {
                this.loadTemplate();
            });

            // Modal events
            this.setupModalEvents();

            // Canvas events
            this.setupCanvasEvents();

            console.log('Event listeners setup complete');
        } catch (error) {
            console.error('Error setting up event listeners:', error);
            throw new Error(`Failed to setup event listeners: ${error.message}`);
        }
    }

    /**
     * Setup text settings listeners
     */
    setupTextSettingsListeners() {
        const elements = {
            'watermarkText': (e) => { 
                this.watermarkSettings.text.content = e.target.value;
                this.updatePreview();
            },
            'textFont': (e) => { 
                this.watermarkSettings.text.font = e.target.value;
                this.updatePreview();
            },
            'textSize': (e) => { 
                this.watermarkSettings.text.size = parseInt(e.target.value);
                document.getElementById('textSizeValue').textContent = `${e.target.value}px`;
                this.updatePreview();
            },
            'textColor': (e) => { 
                this.watermarkSettings.text.color = e.target.value;
                this.updatePreview();
            },
            'textOpacity': (e) => { 
                this.watermarkSettings.text.opacity = parseInt(e.target.value);
                document.getElementById('textOpacityValue').textContent = `${e.target.value}%`;
                this.updatePreview();
            },
            'textRotation': (e) => { 
                this.watermarkSettings.text.rotation = parseInt(e.target.value);
                document.getElementById('textRotationValue').textContent = `${e.target.value}°`;
                this.updatePreview();
            }
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        });
    }

    /**
     * Setup image settings listeners
     */
    setupImageSettingsListeners() {
        const elements = {
            'imageScale': (e) => { 
                this.watermarkSettings.image.scale = parseInt(e.target.value);
                document.getElementById('imageScaleValue').textContent = `${e.target.value}%`;
                this.updatePreview();
            },
            'imageOpacity': (e) => { 
                this.watermarkSettings.image.opacity = parseInt(e.target.value);
                document.getElementById('imageOpacityValue').textContent = `${e.target.value}%`;
                this.updatePreview();
            },
            'imageRotation': (e) => { 
                this.watermarkSettings.image.rotation = parseInt(e.target.value);
                document.getElementById('imageRotationValue').textContent = `${e.target.value}°`;
                this.updatePreview();
            },
            'outputFormat': (e) => { 
                this.watermarkSettings.output.format = e.target.value;
            },
            'outputQuality': (e) => { 
                this.watermarkSettings.output.quality = parseInt(e.target.value);
                document.getElementById('outputQualityValue').textContent = `${e.target.value}%`;
            }
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        });
    }

    /**
     * Setup position listeners with proper scaling
     */
    setupPositionListeners() {
        // Position preset buttons
        document.querySelectorAll('.pos-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.watermarkSettings.position.preset = e.target.dataset.position;
                
                // Reset offsets when changing preset
                this.watermarkSettings.position.x = 0;
                this.watermarkSettings.position.y = 0;
                document.getElementById('positionX').value = 0;
                document.getElementById('positionY').value = 0;
                document.getElementById('positionXValue').textContent = '0px';
                document.getElementById('positionYValue').textContent = '0px';
                
                this.updatePreview();
            });
        });

        // Position offset sliders - these values are in original image coordinates
        const positionX = document.getElementById('positionX');
        const positionY = document.getElementById('positionY');

        positionX.addEventListener('input', (e) => {
            this.watermarkSettings.position.x = parseInt(e.target.value);
            document.getElementById('positionXValue').textContent = `${e.target.value}px`;
            this.updatePreview();
        });

        positionY.addEventListener('input', (e) => {
            this.watermarkSettings.position.y = parseInt(e.target.value);
            document.getElementById('positionYValue').textContent = `${e.target.value}px`;
            this.updatePreview();
        });
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const uploadArea = document.getElementById('sourceUpload');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, this.preventDefaults, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            }, false);
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleSourceFiles(files);
        }, false);
    }

    /**
     * Setup canvas events for interactive positioning
     */
    setupCanvasEvents() {
        const canvas = document.getElementById('previewCanvas');
        
        canvas.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = canvas.getBoundingClientRect();
            this.dragStart = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.currentImageIndex >= 0) {
                const rect = canvas.getBoundingClientRect();
                const currentX = e.clientX - rect.left;
                const currentY = e.clientY - rect.top;
                
                const deltaX = currentX - this.dragStart.x;
                const deltaY = currentY - this.dragStart.y;
                
                // Update position settings
                this.watermarkSettings.position.x += deltaX;
                this.watermarkSettings.position.y += deltaY;
                
                // Update UI sliders
                document.getElementById('positionX').value = this.watermarkSettings.position.x;
                document.getElementById('positionY').value = this.watermarkSettings.position.y;
                document.getElementById('positionXValue').textContent = `${this.watermarkSettings.position.x}px`;
                document.getElementById('positionYValue').textContent = `${this.watermarkSettings.position.y}px`;
                
                this.dragStart = { x: currentX, y: currentY };
                this.updatePreview();
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        // Zoom with mouse wheel
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            if (e.deltaY > 0) {
                this.zoomOut();
            } else {
                this.zoomIn();
            }
        });
    }

    /**
     * Setup modal events
     */
    setupModalEvents() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Results panel close
        document.getElementById('closeResultsBtn').addEventListener('click', () => {
            document.getElementById('resultsPanel').style.display = 'none';
        });
    }

    /**
     * Prevent default drag behaviors
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Handle source file uploads
     */
    async handleSourceFiles(files) {
        try {
            this.showLoading('Loading images...');
            
            const validFiles = Array.from(files).filter(file => {
                return file.type.startsWith('image/');
            });

            if (validFiles.length === 0) {
                throw new Error('No valid image files selected');
            }

            for (const file of validFiles) {
                await this.addSourceImage(file);
            }

            this.updateSourceList();
            this.showNotification(`Added ${validFiles.length} image(s)`, 'success');
            
        } catch (error) {
            console.error('Error handling source files:', error);
            this.showError('Failed to load images', error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Add a source image
     */
    async addSourceImage(file) {
        try {
            // Validate file size (max 50MB)
            if (file.size > 50 * 1024 * 1024) {
                throw new Error(`File ${file.name} is too large (max 50MB)`);
            }

            const imageData = await this.imageProcessor.loadImage(file);
            
            const sourceImage = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: file.size,
                width: imageData.width,
                height: imageData.height,
                imageData: imageData,
                thumbnail: await this.imageProcessor.createThumbnail(imageData, 100, 100)
            };

            this.sourceImages.push(sourceImage);
            
            // Select first image automatically
            if (this.sourceImages.length === 1) {
                this.selectSourceImage(0);
            }

        } catch (error) {
            console.error('Error adding source image:', error);
            throw new Error(`Failed to add ${file.name}: ${error.message}`);
        }
    }

    /**
     * Handle watermark file upload
     */
    async handleWatermarkFile(file) {
        try {
            if (!file) return;

            this.showLoading('Loading watermark...');

            // Handle PSD files
            if (file.name.toLowerCase().endsWith('.psd')) {
                // For PSD files, we'll need a specialized library
                // For now, show an error with guidance
                throw new Error('PSD files require additional processing. Please convert to PNG/JPG first.');
            }

            const imageData = await this.imageProcessor.loadImage(file);
            
            this.watermarkSettings.image.file = file;
            this.watermarkSettings.image.imageData = imageData;

            // Update UI
            const uploadArea = document.getElementById('watermarkUpload');
            uploadArea.innerHTML = `
                <img src="${imageData.src}" alt="Watermark" style="max-width: 100%; max-height: 150px;">
                <p style="margin-top: 0.5rem; font-size: 0.875rem;">${file.name}</p>
            `;
            uploadArea.classList.add('has-image');

            this.updatePreview();
            this.showNotification('Watermark image loaded', 'success');

        } catch (error) {
            console.error('Error handling watermark file:', error);
            this.showError('Failed to load watermark', error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update source images list
     */
    updateSourceList() {
        const container = document.getElementById('sourceList');
        
        if (this.sourceImages.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #64748b; padding: 2rem;">No images loaded</p>';
            return;
        }

        container.innerHTML = this.sourceImages.map((img, index) => `
            <div class="source-item ${index === this.currentImageIndex ? 'selected' : ''}" 
                 data-index="${index}">
                <img src="${img.thumbnail}" alt="${img.name}">
                <div class="source-item-info">
                    <div class="source-item-name">${img.name}</div>
                    <div class="source-item-size">${this.formatFileSize(img.size)} • ${img.width}×${img.height}</div>
                </div>
                <div class="source-item-remove" data-index="${index}">
                    <i class="fas fa-times"></i>
                </div>
            </div>
        `).join('');

        // Add click events
        container.querySelectorAll('.source-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.source-item-remove')) {
                    this.selectSourceImage(index);
                }
            });
        });

        container.querySelectorAll('.source-item-remove').forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.removeSourceImage(index);
            });
        });
    }

    /**
     * Select a source image for preview
     */
    selectSourceImage(index) {
        if (index < 0 || index >= this.sourceImages.length) return;
        
        this.currentImageIndex = index;
        this.updateSourceList();
        this.updatePreview();
        
        // Enable batch processing if we have images
        document.getElementById('previewBatchBtn').disabled = false;
    }

    /**
     * Remove a source image
     */
    removeSourceImage(index) {
        if (index < 0 || index >= this.sourceImages.length) return;
        
        this.sourceImages.splice(index, 1);
        
        // Adjust current index
        if (this.currentImageIndex >= index) {
            this.currentImageIndex--;
        }
        
        if (this.currentImageIndex >= this.sourceImages.length) {
            this.currentImageIndex = this.sourceImages.length - 1;
        }
        
        this.updateSourceList();
        
        if (this.sourceImages.length === 0) {
            this.clearPreview();
            document.getElementById('previewBatchBtn').disabled = true;
        } else {
            this.updatePreview();
        }
    }

    /**
     * Clear all source images
     */
    clearSourceImages() {
        if (this.sourceImages.length === 0) return;
        
        if (confirm('Are you sure you want to remove all images?')) {
            this.sourceImages = [];
            this.currentImageIndex = -1;
            this.updateSourceList();
            this.clearPreview();
            document.getElementById('previewBatchBtn').disabled = true;
            document.getElementById('processBatchBtn').disabled = true;
        }
    }

    /**
     * Switch watermark type
     */
    switchWatermarkType(type) {
        // Update tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });

        // Update settings panels
        document.getElementById('textSettings').style.display = type === 'text' ? 'block' : 'none';
        document.getElementById('imageSettings').style.display = type === 'image' ? 'block' : 'none';

        this.watermarkSettings.type = type;
        this.updatePreview();
    }

    /**
     * Update preview canvas with proper scaling
     */
    async updatePreview() {
        if (this.currentImageIndex < 0 || this.currentImageIndex >= this.sourceImages.length) {
            this.clearPreview();
            return;
        }

        try {
            const sourceImage = this.sourceImages[this.currentImageIndex];
            const canvas = document.getElementById('previewCanvas');
            const ctx = canvas.getContext('2d');

            // Clear canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Calculate display scale and position
            const maxWidth = canvas.width;
            const maxHeight = canvas.height;
            const displayScale = Math.min(maxWidth / sourceImage.width, maxHeight / sourceImage.height) * this.zoom;
            
            const displayWidth = sourceImage.width * displayScale;
            const displayHeight = sourceImage.height * displayScale;
            
            const x = (canvas.width - displayWidth) / 2;
            const y = (canvas.height - displayHeight) / 2;

            // Draw source image
            const img = new Image();
            img.onload = async () => {
                ctx.drawImage(img, x, y, displayWidth, displayHeight);
                
                // Apply watermark with proper scale factor
                // The scale factor ensures watermark positioning matches final output
                const bounds = { x, y, width: displayWidth, height: displayHeight };
                
                // Calculate scale factor: ratio of display size to original size
                const scaleFactor = displayScale;
                
                await this.watermarkEngine.applyWatermark(
                    ctx, 
                    this.watermarkSettings, 
                    bounds,
                    scaleFactor
                );
            };
            img.src = sourceImage.imageData.src;

        } catch (error) {
            console.error('Error updating preview:', error);
            this.showError('Preview Error', 'Failed to update preview');
        }
    }

    /**
     * Clear preview canvas
     */
    clearPreview() {
        const canvas = document.getElementById('previewCanvas');
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '16px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Select an image to preview', canvas.width / 2, canvas.height / 2);
    }

    /**
     * Preview batch processing
     */
    async previewBatch() {
        if (this.sourceImages.length === 0) {
            this.showError('No Images', 'Please add some images first');
            return;
        }

        try {
            this.showLoading('Generating previews...');
            
            // This would generate thumbnails of all processed images
            // For demo purposes, we'll just enable the process button
            document.getElementById('processBatchBtn').disabled = false;
            
            this.showNotification(`Ready to process ${this.sourceImages.length} image(s)`, 'success');
            
        } catch (error) {
            console.error('Error previewing batch:', error);
            this.showError('Preview Error', error.message);
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Process all images in batch
     */
    async processBatch() {
        if (this.sourceImages.length === 0) return;

        try {
            this.showProgress(0, 'Starting batch processing...');
            
            this.processedImages = [];
            
            for (let i = 0; i < this.sourceImages.length; i++) {
                const progress = ((i + 1) / this.sourceImages.length) * 100;
                this.showProgress(progress, `Processing ${i + 1} of ${this.sourceImages.length}...`);
                
                const processedImage = await this.batchProcessor.processImage(
                    this.sourceImages[i],
                    this.watermarkSettings
                );
                
                this.processedImages.push(processedImage);
                
                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            this.hideProgress();
            this.showResults();
            document.getElementById('downloadAllBtn').disabled = false;
            
            this.showNotification('Batch processing completed!', 'success');

        } catch (error) {
            console.error('Error processing batch:', error);
            this.showError('Processing Error', error.message);
            this.hideProgress();
        }
    }

    /**
     * Show processing results
     */
    showResults() {
        const resultsGrid = document.getElementById('resultsGrid');
        
        resultsGrid.innerHTML = this.processedImages.map((img, index) => `
            <div class="result-item">
                <img src="${img.dataUrl}" alt="${img.name}">
                <div class="result-item-name">${img.name}</div>
                <button class="btn btn-sm btn-primary result-item-download" onclick="app.downloadSingle(${index})">
                    <i class="fas fa-download"></i> Download
                </button>
            </div>
        `).join('');
        
        document.getElementById('resultsPanel').style.display = 'flex';
    }

    /**
     * Download single processed image
     */
    downloadSingle(index) {
        if (index < 0 || index >= this.processedImages.length) return;
        
        const img = this.processedImages[index];
        const link = document.createElement('a');
        link.download = img.name;
        link.href = img.dataUrl;
        link.click();
    }

    /**
     * Download all processed images
     */
    async downloadAll() {
        if (this.processedImages.length === 0) return;

        try {
            // For multiple downloads, we'll download them one by one
            // In a real app, you might want to create a ZIP file
            
            for (let i = 0; i < this.processedImages.length; i++) {
                await new Promise(resolve => {
                    setTimeout(() => {
                        this.downloadSingle(i);
                        resolve();
                    }, i * 500); // Delay between downloads
                });
            }
            
            this.showNotification('All images downloaded!', 'success');
            
        } catch (error) {
            console.error('Error downloading images:', error);
            this.showError('Download Error', error.message);
        }
    }

    /**
     * Zoom controls
     */
    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 5);
        this.updateZoomDisplay();
        this.updatePreview();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.1);
        this.updateZoomDisplay();
        this.updatePreview();
    }

    fitToScreen() {
        this.zoom = 1;
        this.updateZoomDisplay();
        this.updatePreview();
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = `${Math.round(this.zoom * 100)}%`;
    }

    /**
     * Template management
     */
    async saveTemplate() {
        try {
            const name = prompt('Enter template name:');
            if (!name) return;

            await this.templateManager.saveTemplate(name, this.watermarkSettings);
            this.showNotification('Template saved successfully!', 'success');
            
        } catch (error) {
            console.error('Error saving template:', error);
            this.showError('Save Error', error.message);
        }
    }

    async loadTemplate() {
        try {
            const templates = await this.templateManager.getTemplates();
            
            if (templates.length === 0) {
                this.showError('No Templates', 'No saved templates found');
                return;
            }

            // For demo, load the first template
            // In a real app, you'd show a selection dialog
            const template = templates[0];
            this.watermarkSettings = { ...template.settings };
            
            // Update UI to reflect loaded settings
            this.updateSettingsUI();
            this.updatePreview();
            
            this.showNotification(`Template "${template.name}" loaded!`, 'success');
            
        } catch (error) {
            console.error('Error loading template:', error);
            this.showError('Load Error', error.message);
        }
    }

    /**
     * Update UI elements to reflect current settings
     */
    updateSettingsUI() {
        // Update text settings
        document.getElementById('watermarkText').value = this.watermarkSettings.text.content;
        document.getElementById('textFont').value = this.watermarkSettings.text.font;
        document.getElementById('textSize').value = this.watermarkSettings.text.size;
        document.getElementById('textColor').value = this.watermarkSettings.text.color;
        document.getElementById('textOpacity').value = this.watermarkSettings.text.opacity;
        document.getElementById('textRotation').value = this.watermarkSettings.text.rotation;

        // Update image settings
        document.getElementById('imageScale').value = this.watermarkSettings.image.scale;
        document.getElementById('imageOpacity').value = this.watermarkSettings.image.opacity;
        document.getElementById('imageRotation').value = this.watermarkSettings.image.rotation;

        // Update position settings
        document.getElementById('positionX').value = this.watermarkSettings.position.x;
        document.getElementById('positionY').value = this.watermarkSettings.position.y;

        // Update output settings
        document.getElementById('outputFormat').value = this.watermarkSettings.output.format;
        document.getElementById('outputQuality').value = this.watermarkSettings.output.quality;

        // Update value displays
        document.getElementById('textSizeValue').textContent = `${this.watermarkSettings.text.size}px`;
        document.getElementById('textOpacityValue').textContent = `${this.watermarkSettings.text.opacity}%`;
        document.getElementById('textRotationValue').textContent = `${this.watermarkSettings.text.rotation}°`;
        document.getElementById('imageScaleValue').textContent = `${this.watermarkSettings.image.scale}%`;
        document.getElementById('imageOpacityValue').textContent = `${this.watermarkSettings.image.opacity}%`;
        document.getElementById('imageRotationValue').textContent = `${this.watermarkSettings.image.rotation}°`;
        document.getElementById('positionXValue').textContent = `${this.watermarkSettings.position.x}px`;
        document.getElementById('positionYValue').textContent = `${this.watermarkSettings.position.y}px`;
        document.getElementById('outputQualityValue').textContent = `${this.watermarkSettings.output.quality}%`;

        // Update active states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === this.watermarkSettings.type);
        });

        document.querySelectorAll('.pos-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.position === this.watermarkSettings.position.preset);
        });

        // Show/hide appropriate settings panels
        this.switchWatermarkType(this.watermarkSettings.type);
    }

    /**
     * Load saved settings from localStorage
     */
    loadSavedSettings() {
        try {
            const saved = localStorage.getItem('watermarkpro-settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.watermarkSettings = { ...this.watermarkSettings, ...settings };
                this.updateSettingsUI();
            }
        } catch (error) {
            console.warn('Failed to load saved settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('watermarkpro-settings', JSON.stringify(this.watermarkSettings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * Setup canvas for proper handling
     */
    setupCanvas() {
        const canvas = document.getElementById('previewCanvas');
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = 800;
        canvas.height = 600;
        
        // Initialize with placeholder
        this.clearPreview();
    }

    /**
     * Utility method to format file sizes
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Show loading indicator
     */
    showLoading(message = 'Loading...') {
        const spinner = document.getElementById('loadingSpinner');
        spinner.querySelector('p').textContent = message;
        spinner.style.display = 'block';
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        document.getElementById('loadingSpinner').style.display = 'none';
    }

    /**
     * Show progress bar
     */
    showProgress(percent, message) {
        const container = document.getElementById('progressContainer');
        const fill = document.getElementById('progressFill');
        const text = document.getElementById('progressText');
        const percentEl = document.getElementById('progressPercent');
        
        container.style.display = 'block';
        fill.style.width = `${percent}%`;
        text.textContent = message;
        percentEl.textContent = `${Math.round(percent)}%`;
    }

    /**
     * Hide progress bar
     */
    hideProgress() {
        document.getElementById('progressContainer').style.display = 'none';
    }

    /**
     * Show success notification
     */
    showNotification(message, type = 'info') {
        // For demo, we'll use browser notifications
        // In production, you'd want a proper toast system
        console.log(`${type.toUpperCase()}: ${message}`);
        
        if (type === 'success') {
            this.showModal('successModal', message);
        }
    }

    /**
     * Show error modal with better visibility
     */
    showError(title, message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        
        // Ensure message is visible
        errorMessage.textContent = `${title}: ${message}`;
        errorMessage.style.color = '#374151';
        errorMessage.style.fontSize = '1rem';
        errorMessage.style.fontWeight = '400';
        errorMessage.style.lineHeight = '1.6';
        
        // Show modal
        errorModal.style.display = 'flex';
        
        // Focus on modal for better accessibility
        setTimeout(() => {
            const closeBtn = errorModal.querySelector('.modal-close');
            if (closeBtn) closeBtn.focus();
        }, 100);
    }

    /**
     * Show success modal with better visibility
     */
    showModal(modalId, message) {
        const modal = document.getElementById(modalId);
        
        if (modalId === 'successModal') {
            const successMessage = document.getElementById('successMessage');
            successMessage.textContent = message;
            successMessage.style.color = '#374151';
            successMessage.style.fontSize = '1rem';
            successMessage.style.fontWeight = '400';
            successMessage.style.lineHeight = '1.6';
        }
        
        modal.style.display = 'flex';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new WatermarkApp();
});

// Handle uncaught errors
window.addEventListener('error', (event) => {
    console.error('Uncaught error:', event.error);
    if (window.app) {
        window.app.showError('Application Error', 'An unexpected error occurred. Please refresh the page.');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (window.app) {
        window.app.showError('Application Error', 'An unexpected error occurred. Please refresh the page.');
    }
});
