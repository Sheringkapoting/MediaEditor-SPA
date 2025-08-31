/**
 * WatermarkPro - Enhanced Interactive Multi-Watermark Image Watermarking Application
 * Complete ready-to-copy code including multi-watermark support and all essential methods
 */
class WatermarkApp {
    constructor() {
        this.sourceImages = [];
        this.currentImageIndex = -1;
        this.processedImages = [];
        this.watermarkSettings = this.getDefaultSettings();
        this.zoom = 1;
        
        // Multi-watermark system
        this.watermarks = [];
        this.selectedWatermarkId = null;
        this.watermarkIdCounter = 0;
        
        // Enhanced drag bounds (6px from edges)
        this.DRAG_MARGIN = 6;
        this.canvasBounds = { width: 0, height: 0 };
        
        // Keep existing single watermark transform for backward compatibility
        this.watermarkTransform = {
            x: 100,
            y: 100,
            width: 200,
            height: 60,
            rotation: 0,
            isDragging: false,
            isResizing: false,
            isRotating: false,
            dragStart: { x: 0, y: 0 },
            resizeHandle: null
        };
        
        this.imageProcessor = new ImageProcessor();
        this.watermarkEngine = new WatermarkEngine();
        this.batchProcessor = new BatchProcessor();
        this.templateManager = new TemplateManager();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initializeApp());
        } else {
            this.initializeApp();
        }
    }

    async initializeApp() {
        try {
            console.log('🚀 Initializing Enhanced WatermarkPro...');
            
            const requiredElements = [
                'sourceInput', 'sourceUpload', 'sourceList',
                'watermarkInput', 'watermarkUpload', 'previewCanvas'
            ];
            const missing = requiredElements.filter(id => !document.getElementById(id));
            if (missing.length > 0) {
                throw new Error(`Missing required elements: ${missing.join(', ')}`);
            }
            
            this.setupEventListeners();
            this.setupDragAndDrop();
            this.setupCanvas();
            this.setupInteractiveWatermark();
            this.setupWatermarkControls();
            this.loadSavedSettings();

            this.showNotification('Welcome to Enhanced WatermarkPro!', 'success');
            console.log('✅ Enhanced WatermarkPro initialized successfully');
            
            // Make debug functions available globally
            window.debugWatermarks = () => this.debugWatermarksState();
            window.debugBatch = () => this.debugBatchState();
            window.app = this; // Make app instance available globally
        } catch (error) {
            console.error('❌ Failed to initialize app:', error);
            this.showError('Failed to initialize application', error.message);
        }
    }

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
                imageData: null,
                scale: 100,
                opacity: 80,
                rotation: 0
            },
            output: {
                format: 'png',
                quality: 95
            }
        };
    }

    // Multi-watermark management methods
    createWatermark(settings = null) {
        const watermarkSettings = settings || { ...this.watermarkSettings };
        const isText = watermarkSettings.type === 'text';
        
        const watermark = {
            id: ++this.watermarkIdCounter,
            settings: watermarkSettings,
            transform: {
                x: 50 + (this.watermarks.length * 30), // Offset each new watermark
                y: 50 + (this.watermarks.length * 30),
                width: isText ? 200 : 150,
                height: isText ? 60 : 100,
                rotation: 0
            },
            zIndex: this.watermarkIdCounter,
            createdAt: Date.now(),
            // Dynamic scaling properties
            scaling: {
                baseFontSize: isText ? watermarkSettings.text.size : null,
                baseWidth: isText ? 200 : 150,
                baseHeight: isText ? 60 : 100,
                aspectRatio: null, // Will be set for images
                minFontSize: 8,
                maxFontSize: 200,
                fontScaleFactor: 1.0,
                maintainAspectRatio: !isText
            }
        };
        
        // Set aspect ratio for images
        if (!isText && watermarkSettings.image && watermarkSettings.image.imageData) {
            const img = watermarkSettings.image.imageData;
            if (img.width && img.height) {
                watermark.scaling.aspectRatio = img.width / img.height;
            }
        }
        
        // Center first watermark only
        if (this.watermarks.length === 0 && this.canvasBounds.width > 0) {
            watermark.transform.x = (this.canvasBounds.width - watermark.transform.width) / 2;
            watermark.transform.y = (this.canvasBounds.height - watermark.transform.height) / 2;
        }
        
        return watermark;
    }

    // Dynamic scaling methods
    calculateDynamicFontSize(watermark) {
        if (watermark.settings.type !== 'text' || !watermark.scaling.baseFontSize) {
            return watermark.settings.text.size;
        }
        
        // Calculate scale factor based on container size change
        const widthScale = watermark.transform.width / watermark.scaling.baseWidth;
        const heightScale = watermark.transform.height / watermark.scaling.baseHeight;
        const scaleFactor = Math.min(widthScale, heightScale);
        
        // Apply scale to base font size
        const newFontSize = watermark.scaling.baseFontSize * scaleFactor;
        
        // Clamp to min/max values
        return Math.max(
            watermark.scaling.minFontSize,
            Math.min(watermark.scaling.maxFontSize, newFontSize)
        );
    }
    
    updateWatermarkScaling(watermark, newWidth, newHeight) {
        // Update transform first
        watermark.transform.width = newWidth;
        watermark.transform.height = newHeight;
        
        if (watermark.settings.type === 'text') {
            // Update font scale factor
            const widthScale = newWidth / watermark.scaling.baseWidth;
            const heightScale = newHeight / watermark.scaling.baseHeight;
            watermark.scaling.fontScaleFactor = Math.min(widthScale, heightScale);
            
            // Update the actual font size in settings
            const newFontSize = this.calculateDynamicFontSize(watermark);
            watermark.settings.text.size = newFontSize;
            
            console.log(`Font size updated: ${newFontSize}px for container ${newWidth}x${newHeight}`);
        } else if (watermark.settings.type === 'image' && watermark.scaling.maintainAspectRatio) {
            // Maintain aspect ratio for images
            if (watermark.scaling.aspectRatio) {
                const targetRatio = watermark.scaling.aspectRatio;
                const currentRatio = newWidth / newHeight;
                
                if (currentRatio > targetRatio) {
                    // Too wide, adjust width
                    newWidth = newHeight * targetRatio;
                } else if (currentRatio < targetRatio) {
                    // Too tall, adjust height
                    newHeight = newWidth / targetRatio;
                }
            }
        }
        
        return { width: watermark.transform.width, height: watermark.transform.height };
    }

    addWatermark(settings = null) {
        // Ensure we have a canvas with bounds
        if (this.canvasBounds.width === 0 || this.canvasBounds.height === 0) {
            this.showNotification('Please load an image first', 'warning');
            return;
        }
        
        const watermark = this.createWatermark(settings);
        this.watermarks.push(watermark); // Make sure this pushes to array
        this.selectedWatermarkId = watermark.id;
        
        // Force overlay update
        this.updateWatermarkOverlays();
        this.updateWatermarkControls();
        this.showNotification(`Watermark added (${this.watermarks.length} total)`, 'success');
        
        console.log('Current watermarks:', this.watermarks.length); // Debug log
        return watermark;
    }

    deleteSelectedWatermark() {
        if (this.selectedWatermarkId) {
            this.deleteWatermark(this.selectedWatermarkId);
        }
    }
    
    deleteWatermark(watermarkId) {
        const index = this.watermarks.findIndex(w => w.id === watermarkId);
        if (index >= 0) {
            this.watermarks.splice(index, 1);
            if (this.selectedWatermarkId === watermarkId) {
                this.selectedWatermarkId = null;
            }
            this.updateWatermarkOverlays();
            this.updateWatermarkControls();
            this.updatePreview().catch(console.error);
            this.showNotification('Watermark deleted', 'info');
        }
    }

    selectWatermark(id) {
        this.selectedWatermarkId = id;
        this.updateWatermarkOverlays();
        this.updateWatermarkControls();
        
        const watermark = this.watermarks.find(w => w.id === id);
        if (watermark) {
            this.watermarkSettings = { ...watermark.settings };
            this.updateSettingsUI();
        }
    }

    setupWatermarkControls() {
        const settingsPanel = document.querySelector('#imageSettings').parentElement;
        
        if (!document.getElementById('watermarkControls')) {
            const controlsHTML = `
                <div id="watermarkControls" class="border-t border-gray-200 pt-4 mt-4">
                    <div class="flex justify-between items-center mb-3">
                        <h3 class="text-sm font-medium text-gray-700">Watermarks</h3>
                        <button id="addWatermarkBtn" class="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                            <i class="fas fa-plus mr-1"></i>Add
                        </button>
                    </div>
                    
                    <div id="watermarkList" class="space-y-2 mb-3"></div>
                    
                    <div id="selectedWatermarkControls" class="space-y-2 hidden">
                        <div class="text-xs text-gray-600 mb-2">Selected Watermark: <span id="selectedWatermarkName" class="font-medium text-blue-600"></span></div>
                    </div>
                </div>
            `;
            
            settingsPanel.insertAdjacentHTML('beforeend', controlsHTML);
        }
    }

    updateWatermarkControls() {
        const watermarkList = document.getElementById('watermarkList');
        const selectedControls = document.getElementById('selectedWatermarkControls');
        
        if (watermarkList) {
            if (this.watermarks.length === 0) {
                watermarkList.innerHTML = '<div class="text-xs text-gray-500">No watermarks</div>';
            } else {
                watermarkList.innerHTML = this.watermarks
                    .sort((a, b) => b.zIndex - a.zIndex)
                    .map(watermark => `
                        <div class="watermark-item flex items-center justify-between p-2 border border-gray-200 rounded text-xs hover:bg-gray-50 ${watermark.id === this.selectedWatermarkId ? 'border-blue-600 bg-blue-50' : ''}" 
                             data-watermark-id="${watermark.id}">
                            <div class="flex items-center space-x-2 cursor-pointer flex-1" onclick="window.app.selectWatermark(${watermark.id})">
                                <i class="fas fa-${watermark.settings.type === 'text' ? 'font' : 'image'} text-gray-500"></i>
                                <span class="truncate">${this.getWatermarkDisplayName(watermark)}</span>
                            </div>
                            <button class="delete-watermark-btn ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded" 
                                    onclick="event.stopPropagation(); window.app.deleteWatermark(${watermark.id})" 
                                    title="Delete watermark">
                                <i class="fas fa-times text-xs"></i>
                            </button>
                        </div>
                    `).join('');
                
                // Click handlers are now inline, no need for additional event listeners
            }
        }
        
        if (selectedControls) {
            selectedControls.classList.toggle('hidden', !this.selectedWatermarkId);
            
            // Update selected watermark name
            const selectedNameSpan = document.getElementById('selectedWatermarkName');
            if (selectedNameSpan && this.selectedWatermarkId) {
                const selectedWatermark = this.watermarks.find(w => w.id === this.selectedWatermarkId);
                if (selectedWatermark) {
                    selectedNameSpan.textContent = this.getWatermarkDisplayName(selectedWatermark);
                }
            }
        }
    }

    getWatermarkDisplayName(watermark) {
        if (watermark.settings.type === 'text') {
            return watermark.settings.text.content.substring(0, 15) + 
                   (watermark.settings.text.content.length > 15 ? '...' : '');
        } else {
            return watermark.settings.image.file?.name?.substring(0, 15) + '...' || 'Image';
        }
    }

    setupEventListeners() {
        try {
            console.log('🔗 Setting up event listeners...');
            
            const sourceInput = document.getElementById('sourceInput');
            const watermarkInput = document.getElementById('watermarkInput');
            
            if (sourceInput) {
                sourceInput.addEventListener('change', (e) => {
                    this.handleSourceFiles(e.target.files);
                });
            }
            
            if (watermarkInput) {
                watermarkInput.addEventListener('change', (e) => {
                    this.handleWatermarkFile(e.target.files[0]);
                });
            }

            const sourceUpload = document.getElementById('sourceUpload');
            const watermarkUpload = document.getElementById('watermarkUpload');
            
            if (sourceUpload && sourceInput) {
                sourceUpload.addEventListener('click', (e) => {
                    e.preventDefault();
                    sourceInput.click();
                });
            }
            
            if (watermarkUpload && watermarkInput) {
                watermarkUpload.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (this.selectedWatermarkId) {
                        watermarkInput.dataset.action = 'replace';
                    } else {
                        watermarkInput.dataset.action = 'add';
                    }
                    watermarkInput.click();
                });
            }

            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const type = e.target.closest('.tab-btn').dataset.type;
                    this.switchWatermarkType(type);
                });
            });

            this.setupTextSettingsListeners();
            this.setupImageSettingsListeners();
            this.setupButtonListeners();
            this.setupModalEvents();

            console.log('✅ Event listeners setup complete');
        } catch (error) {
            console.error('❌ Error setting up event listeners:', error);
        }
    }

    setupTextSettingsListeners() {
        const elements = {
            'watermarkText': (e) => {
                this.watermarkSettings.text.content = e.target.value;
                this.updateSelectedWatermarkSettings();
            },
            'textFont': (e) => {
                this.watermarkSettings.text.font = e.target.value;
                this.updateSelectedWatermarkSettings();
            },
            'textSize': (e) => {
                this.watermarkSettings.text.size = parseInt(e.target.value);
                const valueEl = document.getElementById('textSizeValue');
                if (valueEl) valueEl.textContent = `${e.target.value}px`;
                this.updateSelectedWatermarkSettings();
            },
            'textColor': (e) => {
                this.watermarkSettings.text.color = e.target.value;
                this.updateSelectedWatermarkSettings();
            },
            'textOpacity': (e) => {
                this.watermarkSettings.text.opacity = parseInt(e.target.value);
                const valueEl = document.getElementById('textOpacityValue');
                if (valueEl) valueEl.textContent = `${e.target.value}%`;
                this.updateSelectedWatermarkSettings();
            }
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        });
    }

    setupImageSettingsListeners() {
        const elements = {
            'imageOpacity': (e) => {
                this.watermarkSettings.image.opacity = parseInt(e.target.value);
                const valueEl = document.getElementById('imageOpacityValue');
                if (valueEl) valueEl.textContent = `${e.target.value}%`;
                this.updateSelectedWatermarkSettings();
            },
            'outputFormat': (e) => {
                this.watermarkSettings.output.format = e.target.value;
            },
            'outputQuality': (e) => {
                this.watermarkSettings.output.quality = parseInt(e.target.value);
                const valueEl = document.getElementById('outputQualityValue');
                if (valueEl) valueEl.textContent = `${e.target.value}%`;
            }
        };

        Object.entries(elements).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('input', handler);
            }
        });
    }

    updateSelectedWatermarkSettings() {
        if (this.selectedWatermarkId) {
            const watermark = this.watermarks.find(w => w.id === this.selectedWatermarkId);
            if (watermark) {
                watermark.settings = { ...this.watermarkSettings };
                this.updateWatermarkOverlays();
                this.updatePreview().catch(console.error); // Also update the canvas rendering
            }
        } else {
            this.updateInteractiveWatermark();
        }
    }

    setupButtonListeners() {
        const buttons = {
            'clearSourceBtn': () => this.clearSourceImages(),
            'previewBatchBtn': () => this.previewBatch(),
            'processBatchBtn': () => this.processBatch(),
            'downloadAllBtn': () => this.downloadAll(),
            'zoomInBtn': () => this.zoomIn(),
            'zoomOutBtn': () => this.zoomOut(),
            'fitToScreenBtn': () => this.fitToScreen(),
            'saveTemplateBtn': () => document.getElementById('templateModal').classList.remove('hidden'),
            'loadTemplateBtn': () => this.loadTemplate(),
            'closeResultsBtn': () => document.getElementById('resultsModal').classList.add('hidden'),
            'cancelTemplateBtn': () => document.getElementById('templateModal').classList.add('hidden'),
            'confirmSaveTemplateBtn': () => this.saveTemplate(),
            'addWatermarkBtn': () => this.addWatermark(),
            'deleteWatermarkBtn': () => this.deleteSelectedWatermark()
        };

        Object.entries(buttons).forEach(([id, handler]) => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });
        
        // Add event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            if (e.target.id === 'addWatermarkBtn' || e.target.closest('#addWatermarkBtn')) {
                e.preventDefault();
                this.addWatermark();
            }
            if (e.target.id === 'deleteWatermarkBtn' || e.target.closest('#deleteWatermarkBtn')) {
                e.preventDefault();
                this.deleteSelectedWatermark();
            }
        });
    }

    setupInteractiveWatermark() {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        let dragState = {
            isDragging: false,
            isResizing: false,
            isRotating: false,
            draggedWatermarkId: null,
            resizeHandle: null,
            dragStart: { x: 0, y: 0 }
        };

        document.addEventListener('mousemove', (e) => {
            // Multi-watermark system (NEW)
            if (dragState.isDragging && dragState.draggedWatermarkId) {
                this.handleWatermarkDrag(e, dragState);
            } else if (dragState.isResizing && dragState.draggedWatermarkId) {
                this.handleWatermarkResize(e, dragState);  // ADD THIS METHOD
            } else if (dragState.isRotating && dragState.draggedWatermarkId) {
                this.handleWatermarkRotate(e, dragState);  // ADD THIS METHOD
            } 
            // Single watermark system (EXISTING)
            else if (this.watermarkTransform.isDragging) {
                this.handleDrag(e);                        // KEEP THIS
            } else if (this.watermarkTransform.isResizing) {
                this.handleResize(e);                      // KEEP THIS
            } else if (this.watermarkTransform.isRotating) {
                this.handleRotate(e);                      // KEEP THIS
            }
        });

        document.addEventListener('mouseup', () => {
            if (dragState.isDragging || dragState.isResizing || dragState.isRotating) {
                // Remove dragging class for anti-blur CSS
                if (dragState.draggedWatermarkId) {
                    const overlay = document.querySelector(`[data-watermark-id="${dragState.draggedWatermarkId}"]`);
                    if (overlay) {
                        overlay.classList.remove('dragging');
                    }
                }
                
                // Font size is already updated during resize, no need to recreate overlay
                
                dragState.isDragging = false;
                dragState.isResizing = false;
                dragState.isRotating = false;
                dragState.draggedWatermarkId = null;
                dragState.resizeHandle = null;
                this.updatePreview();
            }
            
            const transform = this.watermarkTransform;
            if (transform.isDragging || transform.isResizing || transform.isRotating) {
                transform.isDragging = false;
                transform.isResizing = false;
                transform.isRotating = false;
                transform.resizeHandle = null;
                const overlay = document.getElementById('watermarkOverlay');
                if (overlay) overlay.style.cursor = 'move';
                this.updatePreview();
            }
        });

        this.dragState = dragState;

        // Keep existing single watermark behavior
        const overlay = document.getElementById('watermarkOverlay');
        if (overlay) {
            overlay.addEventListener('mousedown', (e) => {
                if (e.target.classList.contains('watermark-handle')) {
                    this.startHandleOperation(e);
                } else {
                    this.watermarkTransform.isDragging = true;
                    const rect = overlay.getBoundingClientRect();
                    this.watermarkTransform.dragStart = {
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                    };
                    overlay.style.cursor = 'grabbing';
                }
                e.preventDefault();
                e.stopPropagation();
            });
        }
    }

    handleWatermarkDrag(e, dragState) {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const watermark = this.watermarks.find(w => w.id === dragState.draggedWatermarkId);
        if (!watermark) return;
        
        // FIXED: Correct drag calculation
        const newX = e.clientX - canvasRect.left - dragState.dragStart.x;
        const newY = e.clientY - canvasRect.top - dragState.dragStart.y;
        
        // FIXED: Proper boundary constraints for both X and Y
        const minX = this.DRAG_MARGIN;
        const minY = this.DRAG_MARGIN;
        const maxX = canvasRect.width - watermark.transform.width - this.DRAG_MARGIN;
        const maxY = canvasRect.height - watermark.transform.height - this.DRAG_MARGIN;
        
        // CRITICAL: Update BOTH coordinates with pixel-perfect positioning
        watermark.transform.x = Math.round(Math.max(minX, Math.min(newX, maxX)));
        watermark.transform.y = Math.round(Math.max(minY, Math.min(newY, maxY)));
        
        // Add dragging class for anti-blur CSS
        const overlay = document.querySelector(`[data-watermark-id="${watermark.id}"]`);
        if (overlay) {
            overlay.classList.add('dragging');
        }
        
        // Force immediate visual update
        this.updateWatermarkOverlays();
        // Throttle canvas updates for better performance
        if (!this._updatePreviewTimeout) {
            this._updatePreviewTimeout = setTimeout(() => {
                this.updatePreview().catch(console.error);
                this._updatePreviewTimeout = null;
            }, 16); // ~60fps
        }
    }

    // NEW: Handle multi-watermark resize
    handleWatermarkResize(e, dragState) {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const watermark = this.watermarks.find(w => w.id === dragState.draggedWatermarkId);
        if (!watermark) return;
        
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        const minSize = { width: 50, height: 25 };
        
        if (dragState.resizeHandle.includes('handle-se')) {
            // Bottom-right resize with pixel-perfect positioning
            let newWidth = Math.round(Math.max(minSize.width, 
                Math.min(mouseX - watermark.transform.x, 
                    canvasRect.width - watermark.transform.x - this.DRAG_MARGIN)));
            let newHeight = Math.round(Math.max(minSize.height, 
                Math.min(mouseY - watermark.transform.y, 
                    canvasRect.height - watermark.transform.y - this.DRAG_MARGIN)));
            
            // Apply dynamic scaling
            this.updateWatermarkScaling(watermark, newWidth, newHeight);
        } else if (dragState.resizeHandle.includes('handle-nw')) {
            // Top-left resize with pixel-perfect positioning
            const newX = Math.round(Math.max(this.DRAG_MARGIN, Math.min(mouseX, watermark.transform.x + watermark.transform.width - minSize.width)));
            const newY = Math.round(Math.max(this.DRAG_MARGIN, Math.min(mouseY, watermark.transform.y + watermark.transform.height - minSize.height)));
            let newWidth = Math.round(watermark.transform.x + watermark.transform.width - newX);
            let newHeight = Math.round(watermark.transform.y + watermark.transform.height - newY);
            
            if (newWidth >= minSize.width && newHeight >= minSize.height) {
                watermark.transform.x = newX;
                watermark.transform.y = newY;
                // Apply dynamic scaling
                this.updateWatermarkScaling(watermark, newWidth, newHeight);
            }
        } else if (dragState.resizeHandle.includes('handle-ne')) {
            // Top-right resize with pixel-perfect positioning
            const newY = Math.round(Math.max(this.DRAG_MARGIN, Math.min(mouseY, watermark.transform.y + watermark.transform.height - minSize.height)));
            let newWidth = Math.round(Math.max(minSize.width, Math.min(mouseX - watermark.transform.x, canvasRect.width - watermark.transform.x - this.DRAG_MARGIN)));
            let newHeight = Math.round(watermark.transform.y + watermark.transform.height - newY);
            
            if (newHeight >= minSize.height) {
                watermark.transform.y = newY;
                // Apply dynamic scaling
                this.updateWatermarkScaling(watermark, newWidth, newHeight);
            }
        } else if (dragState.resizeHandle.includes('handle-sw')) {
            // Bottom-left resize with pixel-perfect positioning
            const newX = Math.round(Math.max(this.DRAG_MARGIN, Math.min(mouseX, watermark.transform.x + watermark.transform.width - minSize.width)));
            let newWidth = Math.round(watermark.transform.x + watermark.transform.width - newX);
            let newHeight = Math.round(Math.max(minSize.height, Math.min(mouseY - watermark.transform.y, canvasRect.height - watermark.transform.y - this.DRAG_MARGIN)));
            
            if (newWidth >= minSize.width) {
                watermark.transform.x = newX;
                // Apply dynamic scaling
                this.updateWatermarkScaling(watermark, newWidth, newHeight);
            }
        }
        
        // Update text watermark content without removing overlay to preserve anti-blur classes
        if (watermark.settings.type === 'text') {
            const newFontSize = this.calculateDynamicFontSize(watermark);
            watermark.settings.text.size = newFontSize;
            console.log(`🔄 Font size updated to ${newFontSize}px for container ${watermark.transform.width}x${watermark.transform.height}`);
            
            // Update content without removing overlay to preserve anti-blur CSS
            const overlay = document.querySelector(`[data-watermark-id="${watermark.id}"]`);
            if (overlay) {
                const contentContainer = overlay.querySelector('.watermark-content');
                if (contentContainer) {
                    contentContainer.innerHTML = '';
                    this.addWatermarkContent(contentContainer, watermark);
                    
                    // Update data attributes for change detection
                    overlay.dataset.lastText = watermark.settings.text.content || '';
                    overlay.dataset.lastFontSize = watermark.settings.text.size;
                    overlay.dataset.lastColor = watermark.settings.text.color;
                }
            }
        }
        
        this.updateWatermarkOverlays();
        this.updatePreview().catch(console.error);
    }

    // NEW: Handle multi-watermark rotation
    handleWatermarkRotate(e, dragState) {
        const overlay = document.querySelector(`[data-watermark-id="${dragState.draggedWatermarkId}"]`);
        if (!overlay) return;
        
        const rect = overlay.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const degrees = (angle * 180 / Math.PI) + 90;
        
        const watermark = this.watermarks.find(w => w.id === dragState.draggedWatermarkId);
        if (watermark) {
            watermark.transform.rotation = degrees;
            this.updateWatermarkOverlays();
            this.updatePreview().catch(console.error); // Update canvas rendering
        }
    }

    updateWatermarkOverlays() {
        const container = document.getElementById('canvasContainer');
        const canvas = document.getElementById('previewCanvas');
        if (!container || !canvas) return;

        // Get existing overlays
        const existingOverlays = container.querySelectorAll('.multi-watermark-overlay');
        const existingOverlayMap = new Map();
        existingOverlays.forEach(overlay => {
            const id = overlay.dataset.watermarkId;
            if (id) existingOverlayMap.set(id, overlay);
        });

        // Update or create overlays for each watermark
        this.watermarks.forEach(watermark => {
            const existingOverlay = existingOverlayMap.get(watermark.id);
            if (existingOverlay) {
                // Update existing overlay instead of recreating
                this.updateExistingOverlay(existingOverlay, watermark);
                existingOverlayMap.delete(watermark.id); // Mark as processed
            } else {
                // Create new overlay only if it doesn't exist
                const overlay = this.createWatermarkOverlay(watermark);
                container.appendChild(overlay);
            }
        });

        // Remove overlays for watermarks that no longer exist
        existingOverlayMap.forEach(overlay => overlay.remove());
        
        console.log(`Updated ${this.watermarks.length} watermark overlays`); // Debug log
    }

    updateExistingOverlay(overlay, watermark) {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.parentElement.getBoundingClientRect();
        
        const leftPos = Math.round((canvasRect.left - containerRect.left) + watermark.transform.x);
        const topPos = Math.round((canvasRect.top - containerRect.top) + watermark.transform.y);

        // Update overlay styles without recreating content - pixel-perfect positioning
        overlay.style.left = `${leftPos}px`;
        overlay.style.top = `${topPos}px`;
        overlay.style.width = `${Math.round(watermark.transform.width)}px`;
        overlay.style.height = `${Math.round(watermark.transform.height)}px`;
        overlay.style.transform = `rotate(${watermark.transform.rotation}deg)`;
        overlay.style.border = `2px ${watermark.id === this.selectedWatermarkId ? 'solid' : 'dashed'} #3b82f6`;
        overlay.style.background = `rgba(59, 130, 246, ${watermark.id === this.selectedWatermarkId ? '0.2' : '0.1'})`;
        overlay.style.zIndex = watermark.zIndex + 10;

        // Update content only if watermark data has changed
        const contentContainer = overlay.querySelector('.watermark-content');
        if (contentContainer) {
            // Check if content needs updating by comparing data attributes
            const needsContentUpdate = 
                overlay.dataset.lastText !== (watermark.text || '') ||
                overlay.dataset.lastImageSrc !== (watermark.imageSrc || '') ||
                overlay.dataset.lastFontSize !== watermark.fontSize ||
                overlay.dataset.lastColor !== watermark.color;

            if (needsContentUpdate) {
                contentContainer.innerHTML = '';
                this.addWatermarkContent(contentContainer, watermark);
                
                // Update data attributes
                overlay.dataset.lastText = watermark.text || '';
                overlay.dataset.lastImageSrc = watermark.imageSrc || '';
                overlay.dataset.lastFontSize = watermark.fontSize;
                overlay.dataset.lastColor = watermark.color;
            }
        }

        // Update handles if they exist
        const handles = overlay.querySelectorAll('.watermark-handle');
        if (handles.length === 0) {
            this.addWatermarkHandles(overlay, watermark);
        }
    }

    createWatermarkOverlay(watermark) {
        const canvas = document.getElementById('previewCanvas');
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.parentElement.getBoundingClientRect();
        
        const overlay = document.createElement('div');
        overlay.className = `multi-watermark-overlay ${watermark.id === this.selectedWatermarkId ? 'selected' : ''}`;
        overlay.dataset.watermarkId = watermark.id;
        
        // Initialize data attributes for content tracking
        overlay.dataset.lastText = watermark.text || '';
        overlay.dataset.lastImageSrc = watermark.imageSrc || '';
        overlay.dataset.lastFontSize = watermark.fontSize;
        overlay.dataset.lastColor = watermark.color;
        
        // CRITICAL: Correct position calculation for both X and Y
        const leftPos = (canvasRect.left - containerRect.left) + watermark.transform.x;
        const topPos = (canvasRect.top - containerRect.top) + watermark.transform.y;
        
        overlay.style.cssText = `
            position: absolute;
            left: ${leftPos}px;
            top: ${topPos}px;
            width: ${watermark.transform.width}px;
            height: ${watermark.transform.height}px;
            transform: rotate(${watermark.transform.rotation}deg);
            transform-origin: center center;
            z-index: ${watermark.zIndex + 10};
            border: 2px ${watermark.id === this.selectedWatermarkId ? 'solid' : 'dashed'} #3b82f6;
            background: rgba(59, 130, 246, ${watermark.id === this.selectedWatermarkId ? '0.2' : '0.1'});
            cursor: move;
            user-select: none;
            will-change: transform;
            backface-visibility: hidden;
        `;

        // Create content container
        const contentContainer = document.createElement('div');
        contentContainer.className = 'watermark-content';
        contentContainer.style.cssText = `
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        overlay.appendChild(contentContainer);
        
        // Add watermark content
        this.addWatermarkContent(contentContainer, watermark);
        
        // Add resize/rotate handles
        this.addWatermarkHandles(overlay, watermark);

        // FIXED: Proper mousedown event listener
        overlay.addEventListener('mousedown', (e) => {
            this.selectWatermark(watermark.id);
            
            if (e.target.classList.contains('watermark-handle')) {
                // Handle resize/rotate
                const handle = e.target;
                if (handle.classList.contains('handle-rotate')) {
                    this.dragState.isRotating = true;
                } else {
                    this.dragState.isResizing = true;
                    this.dragState.resizeHandle = handle.className;
                }
                this.dragState.draggedWatermarkId = watermark.id;
            } else {
                // Handle drag - CRITICAL FIX
                this.dragState.isDragging = true;
                this.dragState.draggedWatermarkId = watermark.id;
                
                // FIXED: Calculate drag start relative to canvas, not overlay
                const canvasRect = canvas.getBoundingClientRect();
                this.dragState.dragStart = {
                    x: e.clientX - canvasRect.left - watermark.transform.x,
                    y: e.clientY - canvasRect.top - watermark.transform.y
                };
                overlay.style.cursor = 'grabbing';
            }
            e.preventDefault();
            e.stopPropagation();
        });

        return overlay;
    }


    addWatermarkHandles(overlay, watermark) {
        const handles = [
            { class: 'handle-nw', style: 'top: -7px; left: -7px; cursor: nw-resize;' },
            { class: 'handle-ne', style: 'top: -7px; right: -7px; cursor: ne-resize;' },
            { class: 'handle-sw', style: 'bottom: -7px; left: -7px; cursor: sw-resize;' },
            { class: 'handle-se', style: 'bottom: -7px; right: -7px; cursor: se-resize;' },
            { class: 'handle-rotate', style: 'top: -30px; left: 50%; transform: translateX(-50%); cursor: grab; background: #f59e0b; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center;' }
        ];

        handles.forEach(handleInfo => {
            const handle = document.createElement('div');
            handle.className = `watermark-handle ${handleInfo.class}`;
            handle.style.cssText = `
                position: absolute;
                width: 14px;
                height: 14px;
                background: #3b82f6;
                border: 2px solid white;
                border-radius: 50%;
                box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                ${handleInfo.style}
            `;
            
            if (handleInfo.class === 'handle-rotate') {
                handle.innerHTML = '<i class="fas fa-redo text-white text-xs"></i>';
            }
            
            overlay.appendChild(handle);
        });
    }

    addWatermarkContent(contentContainer, watermark) {
        // Clear existing content without removing the container
        contentContainer.innerHTML = '';
        
        // Apply base styles to the content container
        contentContainer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            overflow: hidden;
        `;
        
        if (watermark.settings.type === 'text') {
            // Text watermark content with dynamic scaling
            const textSpan = document.createElement('span');
            textSpan.textContent = watermark.settings.text.content;
            
            // Use dynamic font size calculation
            const dynamicFontSize = this.calculateDynamicFontSize(watermark);
            
            // Ensure font fits within container bounds
            const maxFontSize = Math.min(
                dynamicFontSize,
                watermark.transform.height * 0.7, // Use 70% of height
                watermark.transform.width / (watermark.settings.text.content.length * 0.5) // Better width estimation
            );
            
            const finalFontSize = Math.max(8, maxFontSize); // Minimum 8px
            
            // Update the watermark settings with the calculated font size
            watermark.settings.text.size = finalFontSize;
            
            textSpan.style.cssText = `
                font-family: ${watermark.settings.text.font};
                font-size: ${Math.round(finalFontSize)}px;
                color: ${watermark.settings.text.color};
                opacity: ${watermark.settings.text.opacity / 100};
                white-space: nowrap;
                text-overflow: ellipsis;
                overflow: hidden;
                max-width: 100%;
                display: block;
                text-align: center;
                line-height: 1.2;
                font-weight: 500;
                text-rendering: optimizeLegibility;
                -webkit-font-smoothing: subpixel-antialiased;
                -moz-osx-font-smoothing: auto;
                transform: translateZ(0) translate3d(0, 0, 0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
                transform-origin: 0 0;
            `;
            contentContainer.appendChild(textSpan);
        } else if (watermark.settings.type === 'image' && watermark.settings.image.imageData) {
            // Image watermark content
            const img = document.createElement('img');
            
            // Handle both data URL and image data object formats
            const imageSrc = typeof watermark.settings.image.imageData === 'string' 
                ? watermark.settings.image.imageData 
                : watermark.settings.image.imageData.src;
                
            img.src = imageSrc;
            // Calculate optimal size to prevent blur
            const naturalWidth = img.naturalWidth || img.width;
            const naturalHeight = img.naturalHeight || img.height;
            const containerWidth = watermark.transform.width;
            const containerHeight = watermark.transform.height;
            
            // Use natural size if smaller than container to prevent upscaling blur
            let displayWidth = '100%';
            let displayHeight = '100%';
            
            if (naturalWidth && naturalHeight) {
                const scaleX = containerWidth / naturalWidth;
                const scaleY = containerHeight / naturalHeight;
                const scale = Math.min(scaleX, scaleY);
                
                if (scale > 1) {
                    // Don't upscale beyond natural size
                    displayWidth = `${naturalWidth}px`;
                    displayHeight = `${naturalHeight}px`;
                }
            }
            
            img.style.cssText = `
                width: ${displayWidth};
                height: ${displayHeight};
                max-width: 100%;
                max-height: 100%;
                opacity: ${watermark.settings.image.opacity / 100};
                object-fit: contain;
                display: block;
                image-rendering: crisp-edges;
                image-rendering: pixelated;
                -ms-interpolation-mode: nearest-neighbor;
                transform: translateZ(0) translate3d(0, 0, 0);
                backface-visibility: hidden;
                will-change: transform;
                -webkit-backface-visibility: hidden;
                transform-origin: 0 0;
            `;
            
            // Add error handling and success logging for image loading
            img.onload = () => {
                console.log('✅ Watermark image loaded successfully:', imageSrc.substring(0, 50) + '...');
            };
            
            img.onerror = () => {
                console.error('❌ Failed to load watermark image:', imageSrc.substring(0, 50) + '...');
                contentContainer.innerHTML = '<div style="color: red; font-size: 10px; text-align: center;">Image Load Error</div>';
            };
            
            contentContainer.appendChild(img);
        }
    }

    startMultiWatermarkHandleOperation(e, watermarkId) {
        const handle = e.target;
        
        if (handle.classList.contains('handle-rotate')) {
            this.dragState.isRotating = true;
        } else {
            this.dragState.isResizing = true;
            this.dragState.resizeHandle = handle.className;
        }
        
        this.dragState.draggedWatermarkId = watermarkId;
        
        // Add dragging class for anti-blur CSS during resize operations
        const overlay = handle.closest('.multi-watermark-overlay');
        if (overlay) {
            overlay.classList.add('dragging');
        }
        
        const rect = overlay.getBoundingClientRect();
        this.dragState.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        e.stopPropagation();
    }

    // Keep existing single watermark methods for backward compatibility
    handleDrag(e) {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const transform = this.watermarkTransform;
        
        const newX = e.clientX - canvasRect.left - transform.dragStart.x;
        const newY = e.clientY - canvasRect.top - transform.dragStart.y;
        
        transform.x = Math.max(this.DRAG_MARGIN, Math.min(newX, canvasRect.width - transform.width - this.DRAG_MARGIN));
        transform.y = Math.max(this.DRAG_MARGIN, Math.min(newY, canvasRect.height - transform.height - this.DRAG_MARGIN));
        
        this.updateWatermarkOverlay();
    }

    handleResize(e) {
        const canvas = document.getElementById('previewCanvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();
        const transform = this.watermarkTransform;
        
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        if (transform.resizeHandle.includes('handle-se')) {
            const newWidth = Math.max(80, Math.min(mouseX - transform.x, canvasRect.width - transform.x - this.DRAG_MARGIN));
            const newHeight = Math.max(40, Math.min(mouseY - transform.y, canvasRect.height - transform.y - this.DRAG_MARGIN));
            
            transform.width = newWidth;
            transform.height = newHeight;
        } else if (transform.resizeHandle.includes('handle-nw')) {
            const newX = Math.max(this.DRAG_MARGIN, Math.min(mouseX, transform.x + transform.width - 80));
            const newY = Math.max(this.DRAG_MARGIN, Math.min(mouseY, transform.y + transform.height - 40));
            const newWidth = transform.x + transform.width - newX;
            const newHeight = transform.y + transform.height - newY;
            
            if (newWidth >= 80 && newHeight >= 40) {
                transform.x = newX;
                transform.y = newY;
                transform.width = newWidth;
                transform.height = newHeight;
            }
        }
        
        this.updateWatermarkOverlay();
    }

    handleRotate(e) {
        const overlay = document.getElementById('watermarkOverlay');
        const rect = overlay.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
        const degrees = (angle * 180 / Math.PI) + 90;
        
        this.watermarkTransform.rotation = degrees;
        this.updateWatermarkOverlay();
    }

    updateWatermarkOverlay() {
        const overlay = document.getElementById('watermarkOverlay');
        const canvas = document.getElementById('previewCanvas');
        if (!overlay || !canvas) return;

        const transform = this.watermarkTransform;
        const canvasRect = canvas.getBoundingClientRect();
        const containerRect = canvas.parentElement.getBoundingClientRect();
        
        const left = (canvasRect.left - containerRect.left) + transform.x;
        const top = (canvasRect.top - containerRect.top) + transform.y;
        
        overlay.style.left = `${left}px`;
        overlay.style.top = `${top}px`;
        overlay.style.width = `${transform.width}px`;
        overlay.style.height = `${transform.height}px`;
        overlay.style.transform = `rotate(${transform.rotation}deg)`;
        overlay.style.transformOrigin = 'center center';
        
        this.updateWatermarkContent();
    }

    updateWatermarkContent() {
        const overlay = document.getElementById('watermarkOverlay');
        if (!overlay) return;
        
        const existingContent = overlay.querySelector('.watermark-content');
        if (existingContent) {
            existingContent.remove();
        }
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'watermark-content';
        contentDiv.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
            user-select: none;
            overflow: hidden;
        `;
        
        if (this.watermarkSettings.type === 'text') {
            const textElement = document.createElement('div');
            textElement.style.cssText = `
                color: ${this.watermarkSettings.text.color};
                font-family: ${this.watermarkSettings.text.font};
                font-size: ${Math.min(this.watermarkSettings.text.size, this.watermarkTransform.height * 0.7)}px;
                opacity: ${this.watermarkSettings.text.opacity / 100};
                white-space: nowrap;
                font-weight: 500;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            `;
            textElement.textContent = this.watermarkSettings.text.content;
            contentDiv.appendChild(textElement);
        } else if (this.watermarkSettings.type === 'image' && this.watermarkSettings.image.imageData) {
            const imgElement = document.createElement('img');
            imgElement.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                opacity: ${this.watermarkSettings.image.opacity / 100};
                object-fit: contain;
            `;
            imgElement.src = this.watermarkSettings.image.imageData.src;
            contentDiv.appendChild(imgElement);
        }
        
        overlay.appendChild(contentDiv);
    }

    startHandleOperation(e) {
        const handle = e.target;
        const transform = this.watermarkTransform;
        
        if (handle.classList.contains('handle-rotate')) {
            transform.isRotating = true;
        } else {
            transform.isResizing = true;
            transform.resizeHandle = handle.className;
        }
        
        const overlay = document.getElementById('watermarkOverlay');
        const rect = overlay.getBoundingClientRect();
        transform.dragStart = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            initialWidth: transform.width,
            initialHeight: transform.height,
            initialRotation: transform.rotation
        };
        
        e.stopPropagation();
    }

    async handleWatermarkFile(file) {
        if (!file) return;
        
        try {
            this.showLoading();
            const imageData = await this.imageProcessor.loadImage(file);
            
            const action = document.getElementById('watermarkInput').dataset.action || 'add';
            
            if (action === 'replace' && this.selectedWatermarkId) {
                const watermark = this.watermarks.find(w => w.id === this.selectedWatermarkId);
                if (watermark) {
                    watermark.settings.type = 'image';
                    watermark.settings.image = {
                        file: file,
                        imageData: imageData.src, // Use the src property
                        scale: 100,
                        opacity: 80,
                        rotation: 0
                    };
                    this.updateWatermarkOverlays();
                    this.showNotification('Watermark replaced', 'success');
                }
            } else {
                // Update current watermark settings
                this.watermarkSettings.type = 'image';
                this.watermarkSettings.image.file = file;
                this.watermarkSettings.image.imageData = imageData.src; // Use the src property
                
                // Always create a new image watermark
                this.addWatermark({
                    type: 'image',
                    text: this.watermarkSettings.text,
                    image: {
                        file: file,
                        imageData: imageData.src, // Use the src property
                        scale: 100,
                        opacity: 80,
                        rotation: 0
                    },
                    output: this.watermarkSettings.output
                });
                
                // Switch to image tab
                this.switchWatermarkType('image');
                
                this.showNotification('Image watermark added', 'success');
            }

            const uploadArea = document.getElementById('watermarkUpload');
            if (uploadArea) {
                uploadArea.innerHTML = `
                    <img src="${imageData.src}" alt="Watermark" class="max-w-full max-h-16 rounded mb-2">
                    <p class="text-xs text-gray-600">${file.name}</p>
                `;
            }
        } catch (error) {
            console.error('Error handling watermark file:', error);
            this.showNotification(`Failed to load watermark: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
            document.getElementById('watermarkInput').dataset.action = 'add';
        }
    }

    switchWatermarkType(type) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold');
            btn.classList.add('text-gray-600');
        });
        
        const activeTab = document.querySelector(`[data-type="${type}"]`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-600');
            activeTab.classList.add('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold');
        }

        const textSettings = document.getElementById('textSettings');
        const imageSettings = document.getElementById('imageSettings');
        
        if (textSettings) textSettings.classList.toggle('hidden', type !== 'text');
        if (imageSettings) imageSettings.classList.toggle('hidden', type !== 'image');

        this.watermarkSettings.type = type;
        
        if (this.selectedWatermarkId) {
            this.updateSelectedWatermarkSettings();
        } else if (this.watermarks.length === 0 && this.currentImageIndex >= 0) {
            this.addWatermark();
        } else {
            this.updateInteractiveWatermark();
        }
    }

    selectSourceImage(index) {
        if (this.currentImageIndex >= 0 && this.sourceImages[this.currentImageIndex]) {
            this.sourceImages[this.currentImageIndex].watermarks = [...this.watermarks];
        }
        
        this.currentImageIndex = index;
        
        if (this.sourceImages[index].watermarks) {
            this.watermarks = [...this.sourceImages[index].watermarks];
            this.watermarkIdCounter = Math.max(this.watermarkIdCounter, 
                ...this.watermarks.map(w => w.id), 0);
        } else {
            this.watermarks = [];
            // Auto-create first watermark when image is loaded
            setTimeout(() => {
                if (this.watermarks.length === 0) {
                    this.addWatermark();
                }
            }, 100); // Small delay to ensure canvas bounds are set
        }
        
        this.selectedWatermarkId = null;
        this.updateSourceList();
        this.updatePreview();
        this.updateWatermarkOverlays();
        this.updateWatermarkControls();
        
        const overlay = document.getElementById('canvasOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('sourceUpload');
        if (!uploadArea) return;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            document.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
            
            uploadArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            uploadArea.addEventListener(eventName, () => {
                uploadArea.classList.remove('dragover');
            });
        });

        uploadArea.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            this.handleSourceFiles(files);
        });
    }

    setupCanvas() {
        const canvas = document.getElementById('previewCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        }
    }

    setupModalEvents() {
        document.querySelectorAll('[id$="Modal"]').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    async handleSourceFiles(files) {
        if (!files || files.length === 0) return;
        
        try {
            this.showLoading();
            
            const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
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
            this.showNotification(`Failed to load images: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async addSourceImage(file) {
        try {
            const imageData = await this.imageProcessor.loadImage(file);
            const sourceImage = {
                id: Date.now() + Math.random(),
                file: file,
                name: file.name,
                size: file.size,
                width: imageData.width,
                height: imageData.height,
                imageData: imageData,
                thumbnail: await this.imageProcessor.createThumbnail(imageData, 80, 80),
                watermarks: []
            };

            this.sourceImages.push(sourceImage);

            if (this.sourceImages.length === 1) {
                this.selectSourceImage(0);
            }
        } catch (error) {
            throw error;
        }
    }

    updateSourceList() {
        const container = document.getElementById('sourceList');
        if (!container) return;
        
        if (this.sourceImages.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-6">
                    <i class="fas fa-images text-2xl mb-2"></i>
                    <p class="text-sm">No images loaded</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.sourceImages.map((img, index) => `
            <div class="source-item flex items-center space-x-2 p-2 border border-gray-200 rounded-lg mb-2 cursor-pointer hover:border-blue-600 hover:bg-blue-50 transition-all duration-200 ${index === this.currentImageIndex ? 'border-blue-600 bg-blue-50' : ''}" data-index="${index}">
                <img src="${img.thumbnail}" alt="${img.name}" class="w-10 h-10 object-cover rounded">
                <div class="flex-1 min-w-0">
                    <p class="text-xs font-medium text-gray-900 truncate">${img.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(img.size)} • ${(img.watermarks || []).length} watermarks</p>
                </div>
                <button class="remove-btn text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" data-index="${index}">
                    <i class="fas fa-times text-xs"></i>
                </button>
            </div>
        `).join('');

        container.querySelectorAll('.source-item').forEach((item, index) => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.remove-btn')) {
                    this.selectSourceImage(index);
                }
            });
        });
        
        container.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.closest('.remove-btn').dataset.index);
                this.removeSourceImage(index);
            });
        });
    }

    removeSourceImage(index) {
        const removedImage = this.sourceImages.splice(index, 1)[0];
        
        if (this.currentImageIndex === index) {
            this.currentImageIndex = this.sourceImages.length > 0 ? 0 : -1;
        } else if (this.currentImageIndex > index) {
            this.currentImageIndex--;
        }
        
        this.updateSourceList();
        
        if (this.sourceImages.length === 0) {
            this.clearPreview();
        } else if (this.currentImageIndex >= 0) {
            this.selectSourceImage(this.currentImageIndex);
        }
        
        this.showNotification(`Removed ${removedImage.name}`, 'info');
    }

    clearSourceImages() {
        this.sourceImages = [];
        this.currentImageIndex = -1;
        this.watermarks = [];
        this.selectedWatermarkId = null;
        this.updateSourceList();
        this.clearPreview();
        this.hideInteractiveWatermark();
        this.updateWatermarkControls();
        this.showNotification('All images cleared', 'info');
    }

    clearPreview() {
        const canvas = document.getElementById('previewCanvas');
        const overlay = document.getElementById('canvasOverlay');
        
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        }
        
        if (overlay) overlay.style.display = 'flex';
        this.hideInteractiveWatermark();
    }

    async updatePreview() {
        if (this.currentImageIndex < 0 || !this.sourceImages[this.currentImageIndex]) {
            return;
        }

        try {
            const canvas = document.getElementById('previewCanvas');
            if (!canvas) return;
            
            const ctx = canvas.getContext('2d');
            const sourceImage = this.sourceImages[this.currentImageIndex];
            const img = sourceImage.imageData.element;

            const container = canvas.parentElement;
            const containerWidth = container.clientWidth - 32;
            const containerHeight = Math.max(container.clientHeight - 32, 500);
            
            const scaleToFit = Math.min(
                containerWidth / img.width,
                containerHeight / img.height
            );
            
            const finalScale = scaleToFit * this.zoom;
            const previewWidth = Math.round(img.width * finalScale);
            const previewHeight = Math.round(img.height * finalScale);

            // Set up high-DPI rendering
            const devicePixelRatio = window.devicePixelRatio || 1;
            canvas.width = previewWidth * devicePixelRatio;
            canvas.height = previewHeight * devicePixelRatio;
            canvas.style.width = previewWidth + 'px';
            canvas.style.height = previewHeight + 'px';
            
            // Scale context for high-DPI
            ctx.scale(devicePixelRatio, devicePixelRatio);
            
            // Improve rendering quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            this.canvasBounds = { width: previewWidth, height: previewHeight };

            ctx.clearRect(0, 0, previewWidth, previewHeight);
            ctx.drawImage(img, 0, 0, previewWidth, previewHeight);

            // Dynamically update watermark settings before rendering
            this.watermarks.forEach(watermark => {
                if (watermark.settings.type === 'text') {
                    // Update the font size based on the current container dimensions
                    const newFontSize = this.calculateDynamicFontSize(watermark);
                    watermark.settings.text.size = newFontSize;
                }
            });

            // Render all watermarks on the canvas
            await this.renderWatermarksOnCanvas(ctx, previewWidth, previewHeight);

            if (this.watermarkTransform.x === 0 && this.watermarkTransform.y === 0) {
                this.watermarkTransform.x = (previewWidth - this.watermarkTransform.width) / 2;
                this.watermarkTransform.y = (previewHeight - this.watermarkTransform.height) / 2;
            } else {
                this.watermarkTransform.x = Math.min(this.watermarkTransform.x, previewWidth - this.watermarkTransform.width - this.DRAG_MARGIN);
                this.watermarkTransform.y = Math.min(this.watermarkTransform.y, previewHeight - this.watermarkTransform.height - this.DRAG_MARGIN);
                this.watermarkTransform.x = Math.max(this.DRAG_MARGIN, this.watermarkTransform.x);
                this.watermarkTransform.y = Math.max(this.DRAG_MARGIN, this.watermarkTransform.y);
            }
            
            if (this.currentImageIndex >= 0) {
                this.updateWatermarkOverlay();
                this.updateWatermarkOverlays();
            }
        } catch (error) {
            console.error('Error updating preview:', error);
        }
    }

    async renderWatermarksOnCanvas(ctx, canvasWidth, canvasHeight) {
        // Sort watermarks by z-index (lowest first)
        const sortedWatermarksToRender = [...this.watermarks].sort((a, b) => a.zIndex - b.zIndex);
        
        for (const watermark of sortedWatermarksToRender) {
            await this.renderSingleWatermark(ctx, watermark, canvasWidth, canvasHeight);
        }
    }

    async renderSingleWatermark(ctx, watermark, canvasWidth, canvasHeight) {
        ctx.save();
        
        // Apply transformation
        const centerX = watermark.transform.x + watermark.transform.width / 2;
        const centerY = watermark.transform.y + watermark.transform.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.rotate((watermark.transform.rotation * Math.PI) / 180);
        ctx.translate(-centerX, -centerY);
        
        if (watermark.settings.type === 'text') {
            await this.renderTextWatermark(ctx, watermark);
        } else if (watermark.settings.type === 'image' && watermark.settings.image.imageData) {
            await this.renderImageWatermark(ctx, watermark);
        }
        
        ctx.restore();
    }

    async renderTextWatermark(ctx, watermark) {
        const { text } = watermark.settings;
        const { transform } = watermark;
        
        // Save current context state
        ctx.save();
        
        // Improve text rendering quality
        ctx.textRenderingOptimization = 'optimizeQuality';
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Use dynamic font size calculation for consistent scaling
        const dynamicFontSize = this.calculateDynamicFontSize(watermark);
        const fontSize = Math.max(8, Math.min(dynamicFontSize, transform.height * 0.7));
        
        ctx.font = `500 ${fontSize}px ${text.font}`;
        ctx.fillStyle = text.color;
        ctx.globalAlpha = text.opacity / 100;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = transform.x + transform.width / 2;
        const textY = transform.y + transform.height / 2;
        
        // Add subtle text stroke for better visibility and sharpness
        if (text.color === '#ffffff' || text.color.toLowerCase() === '#fff' || text.color.toLowerCase() === 'white') {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = Math.max(0.5, fontSize / 30);
            ctx.strokeText(text.content, textX, textY);
        } else {
            // Add very subtle white stroke for dark text
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineWidth = Math.max(0.5, fontSize / 40);
            ctx.strokeText(text.content, textX, textY);
        }
        
        // Draw main text with enhanced quality
        ctx.fillText(text.content, textX, textY);
        
        // Restore context state
        ctx.restore();
    }

    async renderImageWatermark(ctx, watermark) {
        const { image } = watermark.settings;
        const { transform } = watermark;
        
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                console.log('✅ Rendering watermark image on canvas:', imageSrc.substring(0, 50) + '...');
                
                // Save context state
                ctx.save();
                
                // Improve image rendering quality
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.globalAlpha = image.opacity / 100;
                
                // Enhanced high-quality image rendering
                const originalWidth = img.naturalWidth || img.width;
                const originalHeight = img.naturalHeight || img.height;
                
                if (originalWidth && originalHeight) {
                    // Use high-DPI scaling for crisp rendering
                    const devicePixelRatio = window.devicePixelRatio || 1;
                    
                    // Calculate scale factor maintaining aspect ratio
                    const scaleX = transform.width / originalWidth;
                    const scaleY = transform.height / originalHeight;
                    const scale = Math.min(scaleX, scaleY);
                    
                    // Calculate centered position
                    const scaledWidth = originalWidth * scale;
                    const scaledHeight = originalHeight * scale;
                    const offsetX = (transform.width - scaledWidth) / 2;
                    const offsetY = (transform.height - scaledHeight) / 2;
                    
                    // Save context for quality settings
                    ctx.save();
                    
                    // Apply high-quality rendering settings
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Draw with pixel-perfect positioning
                    const drawX = Math.round(transform.x + offsetX);
                    const drawY = Math.round(transform.y + offsetY);
                    const drawWidth = Math.round(scaledWidth);
                    const drawHeight = Math.round(scaledHeight);
                    
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    
                    ctx.restore();
                } else {
                    // Fallback with quality settings
                    ctx.save();
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 
                        Math.round(transform.x), 
                        Math.round(transform.y), 
                        Math.round(transform.width), 
                        Math.round(transform.height)
                    );
                    ctx.restore();
                }
                
                // Restore context state
                ctx.restore();
                resolve();
            };
            img.onerror = () => {
                console.error('❌ Failed to render watermark image on canvas:', imageSrc.substring(0, 50) + '...');
                resolve(); // Continue even if image fails to load
            };
            
            // Handle both data URL and image data object formats
            const imageSrc = typeof image.imageData === 'string' 
                ? image.imageData 
                : image.imageData.src;
                
            img.src = imageSrc;
        });
    }

    // Debug method to check watermark state
    debugWatermarksState() {
        console.log('=== WATERMARKS DEBUG ===');
        console.log('Total watermarks:', this.watermarks.length);
        console.log('Selected watermark ID:', this.selectedWatermarkId);
        console.log('Canvas bounds:', this.canvasBounds);
        console.log('Watermarks:', this.watermarks.map(w => ({
            id: w.id,
            type: w.settings.type,
            position: { x: w.transform.x, y: w.transform.y },
            size: { width: w.transform.width, height: w.transform.height },
            rotation: w.transform.rotation,
            zIndex: w.zIndex
        })));
        console.log('========================');
    }

    debugBatchState() {
        console.log('=== BATCH DEBUG ===');
        console.log('Source images:', this.sourceImages.length);
        console.log('Current image index:', this.currentImageIndex);
        console.log('Source images with watermarks:', this.sourceImages.map((img, i) => ({
            index: i,
            name: img.name,
            hasWatermarks: !!img.watermarks,
            watermarkCount: img.watermarks ? img.watermarks.length : 0
        })));
        console.log('Current watermarks:', this.watermarks.length);
        console.log('Batch settings:', this.getWatermarkSettingsFromTransform());
        console.log('==================');
    }

    updateInteractiveWatermark() {
        this.updateWatermarkOverlay();
    }

    showInteractiveWatermark() {
        const overlay = document.getElementById('watermarkOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            this.updateWatermarkOverlay();
        }
        this.updateWatermarkOverlays();
        this.updateWatermarkControls();
    }

    hideInteractiveWatermark() {
        const overlay = document.getElementById('watermarkOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
        const container = document.getElementById('canvasContainer');
        if (container) {
            container.querySelectorAll('.multi-watermark-overlay').forEach(overlay => {
                overlay.remove();
            });
        }
    }

    async previewBatch() {
        if (this.sourceImages.length === 0) {
            this.showNotification('No images to preview', 'warning');
            return;
        }

        try {
            this.showLoading();
            const settings = this.getWatermarkSettingsFromTransform();
            const previews = await this.batchProcessor.createPreviewBatch(
                this.sourceImages.slice(0, 6), 
                settings
            );
            this.showPreviews(previews);
        } catch (error) {
            console.error('Error generating batch preview:', error);
            this.showNotification(`Failed to generate previews: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async processBatch() {
        if (this.sourceImages.length === 0) {
            this.showNotification('No images to process', 'warning');
            return;
        }

        try {
            this.showProgress(true);
            
            // Save current watermarks to current image
            if (this.currentImageIndex >= 0 && this.sourceImages[this.currentImageIndex]) {
                this.sourceImages[this.currentImageIndex].watermarks = [...this.watermarks];
            }
            
            // Apply current watermarks to ALL images in batch
            const settings = this.getWatermarkSettingsFromTransform();
            
            console.log(`🔄 Processing batch with ${this.sourceImages.length} images and ${this.watermarks.length} watermarks`);
            console.log('Generated settings:', settings);
            
            // Ensure we have watermarks to apply
            if (!settings || (Array.isArray(settings) && settings.length === 0)) {
                this.showNotification('No watermarks to apply. Please add at least one watermark.', 'warning');
                this.showProgress(false);
                return;
            }
            
            console.log(`✅ Batch processing ${settings.length} watermark(s) on ${this.sourceImages.length} image(s)`);
            
            this.batchProcessor.setProgressCallback((progress) => {
                this.updateProgress(progress.percent, progress.message);
            });

            this.batchProcessor.clearQueue();
            this.batchProcessor.addToQueue(this.sourceImages, settings);
            const results = await this.batchProcessor.processQueue();
            
            this.processedImages = results.results;
            this.showProgress(false);
            this.showResults();
            
            this.showNotification(`Successfully processed ${results.completed} image(s)`, 'success');
        } catch (error) {
            console.error('Error during batch processing:', error);
            this.showNotification(`Batch processing failed: ${error.message}`, 'error');
            this.showProgress(false);
        }
    }

    getWatermarkSettingsFromTransform() {
        console.log(`🔧 Generating batch settings for ${this.watermarks.length} watermarks`);
        console.log(`Canvas bounds: ${this.canvasBounds.width}x${this.canvasBounds.height}`);
        
        const toSettingsFromWatermark = (wm) => {
            // Clone the base settings for this watermark
            const out = JSON.parse(JSON.stringify(wm.settings));

            // Normalized center position (0..1000) so it scales to any output size
            const cx = wm.transform.x + wm.transform.width / 2;
            const cy = wm.transform.y + wm.transform.height / 2;

            // Ensure canvas bounds are valid
            const canvasWidth = this.canvasBounds.width || 800;
            const canvasHeight = this.canvasBounds.height || 600;

            out.position = {
                preset: 'custom',
                x: Math.round((cx / canvasWidth) * 1000),
                y: Math.round((cy / canvasHeight) * 1000)
            };
            
            // CRITICAL FIX: Include transform data for applyTextWatermark method
            // Scale transform coordinates from preview canvas to actual image dimensions
            const previewToImageScaleX = 1; // Will be calculated per image during batch processing
            const previewToImageScaleY = 1; // Will be calculated per image during batch processing
            
            out.transform = {
                x: wm.transform.x,
                y: wm.transform.y,
                width: wm.transform.width,
                height: wm.transform.height,
                rotation: wm.transform.rotation || 0,
                // Store preview canvas dimensions for scaling during batch processing
                previewCanvasWidth: canvasWidth,
                previewCanvasHeight: canvasHeight
            };
            
            console.log(`  Watermark ${wm.id}: ${wm.settings.type} at (${cx},${cy}) -> normalized (${out.position.x},${out.position.y})`);

            // Push the live rotation and scaling into the settings
            if (out.type === 'text') {
                out.text.rotation = Math.round(wm.transform.rotation || 0);
                
                // Apply dynamic font scaling for batch processing
                const dynamicFontSize = this.calculateDynamicFontSize(wm);
                out.text.size = Math.round(dynamicFontSize);
                
                // Store scaling information for consistent application
                out.text.scalingInfo = {
                    containerWidth: wm.transform.width,
                    containerHeight: wm.transform.height,
                    baseFontSize: wm.scaling.baseFontSize,
                    scaleFactor: wm.scaling.fontScaleFactor
                };
            } else if (out.type === 'image') {
                out.image.rotation = Math.round(wm.transform.rotation || 0);

                // Enhanced image scaling with aspect ratio preservation
                const nat = wm.settings.image?.imageData?.element;
                if (nat && nat.width && nat.height) {
                    // Calculate scale based on container dimensions
                    const scaleX = wm.transform.width / nat.width;
                    const scaleY = wm.transform.height / nat.height;
                    const scale = Math.min(scaleX, scaleY); // Maintain aspect ratio
                    
                    out.image.scale = Math.max(1, Math.min(500, Math.round(scale * 100)));
                    
                    // Store scaling information
                    out.image.scalingInfo = {
                        containerWidth: wm.transform.width,
                        containerHeight: wm.transform.height,
                        aspectRatio: wm.scaling.aspectRatio,
                        maintainAspectRatio: wm.scaling.maintainAspectRatio
                    };
                }
            }

            return out;
        };

        if (this.watermarks.length > 0) {
            // Apply bottom -> top drawing order; we draw in array order
            const ordered = [...this.watermarks].sort((a, b) => a.zIndex - b.zIndex);
            return ordered.map(toSettingsFromWatermark);
        }

        // Fallback: single watermark mode (legacy box)
        const settings = { ...this.watermarkSettings };
        const t = this.watermarkTransform;

        const cx = t.x + t.width / 2;
        const cy = t.y + t.height / 2;

        settings.position = {
            preset: 'custom',
            x: Math.round((cx / this.canvasBounds.width) * 1000),
            y: Math.round((cy / this.canvasBounds.height) * 1000)
        };
        
        // CRITICAL FIX: Include transform data for legacy mode
        // Ensure canvas bounds are valid
        const canvasWidth = this.canvasBounds.width || 800;
        const canvasHeight = this.canvasBounds.height || 600;
        
        settings.transform = {
            x: t.x,
            y: t.y,
            width: t.width,
            height: t.height,
            rotation: t.rotation || 0,
            // Store preview canvas dimensions for scaling during batch processing
            previewCanvasWidth: canvasWidth,
            previewCanvasHeight: canvasHeight
        };

        if (settings.type === 'text') {
            settings.text.rotation = Math.round(t.rotation || 0);
        } else if (settings.type === 'image') {
            settings.image.rotation = Math.round(t.rotation || 0);
            // Heuristic: reflect box width into scale (natural width unknown in legacy)
            settings.image.scale = Math.max(1, Math.min(500, Math.round((t.width / 200) * 100)));
        }

        return settings;
    }

    showPreviews(previews) {
        const grid = document.getElementById('resultsGrid');
        if (!grid) return;
        
        grid.innerHTML = previews.map(preview => `
            <div class="text-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <img src="${preview.previewDataUrl}" alt="${preview.originalName}" class="w-full max-h-48 object-contain rounded mb-2 bg-gray-50">
                <p class="text-xs text-gray-600 truncate">${preview.originalName}</p>
            </div>
        `).join('');
        
        document.getElementById('resultsModal').classList.remove('hidden');
    }

    showResults() {
        const grid = document.getElementById('resultsGrid');
        if (!grid) return;
        
        grid.innerHTML = this.processedImages.map((result, index) => `
            <div class="text-center p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                <img src="${result.dataUrl}" alt="${result.name}" class="w-full max-h-48 object-contain rounded mb-2 bg-gray-50">
                <p class="text-xs text-gray-600 truncate mb-2">${result.name}</p>
                <button class="download-single-btn w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors" data-index="${index}">
                    <i class="fas fa-download mr-1"></i>
                    Download
                </button>
            </div>
        `).join('');
        
        grid.querySelectorAll('.download-single-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.download-single-btn').dataset.index);
                this.downloadSingle(index);
            });
        });
        
        document.getElementById('resultsModal').classList.remove('hidden');
    }

    downloadSingle(index) {
        if (index >= 0 && index < this.processedImages.length) {
            const result = this.processedImages[index];
            const link = document.createElement('a');
            link.download = result.name;
            link.href = result.dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`Downloaded ${result.name}`, 'success');
        }
    }

    downloadAll() {
        if (this.processedImages.length === 0) {
            this.showNotification('No processed images to download', 'warning');
            return;
        }

        this.processedImages.forEach((result, index) => {
            setTimeout(() => this.downloadSingle(index), index * 500);
        });
        
        this.showNotification(`Starting download of ${this.processedImages.length} images`, 'info');
    }

    async saveTemplate() {
        const nameInput = document.getElementById('templateName');
        if (!nameInput) return;
        
        const name = nameInput.value.trim();
        if (!name) {
            this.showNotification('Please enter a template name', 'warning');
            return;
        }

        // Check if we have any watermarks to save
        if (this.watermarks.length === 0) {
            this.showNotification('No watermarks to save. Please add watermarks first.', 'warning');
            return;
        }

        try {
            this.showLoading();
            
            // Create complete template data with all watermarks
            const templateData = {
                watermarks: await Promise.all(this.watermarks.map(async (watermark) => {
                    const watermarkCopy = {
                        id: watermark.id,
                        settings: { ...watermark.settings },
                        transform: { ...watermark.transform },
                        zIndex: watermark.zIndex,
                        scaling: { ...watermark.scaling }
                    };
                    
                    // Handle image watermarks - ensure imageData is preserved
                    if (watermarkCopy.settings.type === 'image' && watermarkCopy.settings.image) {
                        // If we have a File object but no imageData, convert it
                        if (watermarkCopy.settings.image.file && !watermarkCopy.settings.image.imageData) {
                            try {
                                const imageData = await this.imageProcessor.loadImage(watermarkCopy.settings.image.file);
                                watermarkCopy.settings.image.imageData = imageData.src;
                            } catch (error) {
                                console.warn('Failed to convert image file to data URL:', error);
                            }
                        }
                        
                        // Remove the File object as it cannot be serialized
                        delete watermarkCopy.settings.image.file;
                        
                        // Ensure we have imageData for the template
                        if (!watermarkCopy.settings.image.imageData) {
                            console.warn('Image watermark missing imageData, template may not load correctly');
                        }
                    }
                    
                    return watermarkCopy;
                })),
                canvasBounds: { ...this.canvasBounds },
                version: '2.0', // Template format version
                createdAt: Date.now()
            };
            
            await this.templateManager.saveTemplate(name, templateData);
            document.getElementById('templateModal').classList.add('hidden');
            nameInput.value = '';
            this.showNotification(`Template "${name}" saved with ${this.watermarks.length} watermark(s)`, 'success');
        } catch (error) {
            console.error('Error saving template:', error);
            this.showNotification('Failed to save template', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async loadTemplate() {
        try {
            const templates = await this.templateManager.getTemplates();
            if (templates.length === 0) {
                this.showNotification('No saved templates found', 'info');
                return;
            }

            // Show template selection modal
            await this.showTemplateSelectionModal(templates);
        } catch (error) {
            console.error('Error loading template:', error);
            this.showNotification('Failed to load template', 'error');
        }
    }

    async showTemplateSelectionModal(templates) {
        return new Promise((resolve) => {
            // Create modal HTML
            const modalHTML = `
                <div id="templateSelectionModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <h3 class="text-lg font-semibold text-gray-900">Select Template to Load</h3>
                        </div>
                        <div class="px-6 py-4 max-h-96 overflow-y-auto">
                            <div class="space-y-2">
                                ${templates.map(template => `
                                    <div class="template-option p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors" data-template-id="${template.id}">
                                        <div class="font-medium text-gray-900">${template.name}</div>
                                        <div class="text-sm text-gray-500">
                                            ${new Date(template.createdAt).toLocaleDateString()} • 
                                            ${template.settings?.watermarks?.length || 1} watermark(s)
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                            <button id="cancelTemplateSelection" class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
                        </div>
                    </div>
                </div>
            `;

            // Add modal to DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            const modal = document.getElementById('templateSelectionModal');

            // Handle template selection
            modal.addEventListener('click', async (e) => {
                const templateOption = e.target.closest('.template-option');
                if (templateOption) {
                    const templateId = templateOption.dataset.templateId;
                    await this.loadSelectedTemplate(templateId);
                    modal.remove();
                    resolve();
                }
            });

            // Handle cancel
            document.getElementById('cancelTemplateSelection').addEventListener('click', () => {
                modal.remove();
                resolve();
            });

            // Handle click outside modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    resolve();
                }
            });
        });
    }

    async loadSelectedTemplate(templateId) {
        try {
            const template = await this.templateManager.loadTemplate(templateId);
            
            // Clear existing watermarks
            this.watermarks = [];
            this.selectedWatermarkId = null;
            this.watermarkIdCounter = 0;

            // Check template format version
            if (template.settings?.version === '2.0' && template.settings?.watermarks) {
                // New multi-watermark format
                const templateData = template.settings;
                
                // Restore canvas bounds if available
                if (templateData.canvasBounds) {
                    this.canvasBounds = { ...templateData.canvasBounds };
                }

                // Restore all watermarks
                for (const watermarkData of templateData.watermarks) {
                    const watermark = {
                        id: watermarkData.id || ++this.watermarkIdCounter,
                        settings: { ...watermarkData.settings },
                        transform: { ...watermarkData.transform },
                        zIndex: watermarkData.zIndex || this.watermarkIdCounter,
                        scaling: { ...watermarkData.scaling }
                    };
                    
                    // Handle image watermarks - restore imageData properly
                    if (watermark.settings.type === 'image' && watermark.settings.image && watermark.settings.image.imageData) {
                        try {
                            // If imageData is a string (data URL), convert it to Image object
                            if (typeof watermark.settings.image.imageData === 'string') {
                                const imageData = await this.imageProcessor.loadImageFromDataURL(watermark.settings.image.imageData);
                                watermark.settings.image.imageData = imageData;
                                
                                // Ensure width and height are set
                                if (!watermark.settings.image.width || !watermark.settings.image.height) {
                                    watermark.settings.image.width = imageData.width || 100;
                                    watermark.settings.image.height = imageData.height || 100;
                                }
                            }
                        } catch (error) {
                            console.warn('Failed to load image from template:', error);
                            // Keep the original imageData as fallback
                        }
                    }
                    
                    // Update counter to avoid ID conflicts
                    if (watermark.id > this.watermarkIdCounter) {
                        this.watermarkIdCounter = watermark.id;
                    }
                    
                    this.watermarks.push(watermark);
                }

                // Select the first watermark if any exist
                if (this.watermarks.length > 0) {
                    this.selectedWatermarkId = this.watermarks[0].id;
                    this.watermarkSettings = { ...this.watermarks[0].settings };
                }
            } else {
                // Legacy single watermark format
                const legacySettings = { ...template.settings };
                
                // Handle legacy image watermarks
                if (legacySettings.type === 'image' && legacySettings.image && legacySettings.image.imageData) {
                    try {
                        if (typeof legacySettings.image.imageData === 'string') {
                            const imageData = await this.imageProcessor.loadImageFromDataURL(legacySettings.image.imageData);
                            legacySettings.image.imageData = imageData;
                        }
                    } catch (error) {
                        console.warn('Failed to load legacy image from template:', error);
                    }
                }
                
                this.watermarkSettings = legacySettings;
                if (this.currentImageIndex >= 0) {
                    this.addWatermark(legacySettings);
                }
            }

            // Update UI
            this.updateWatermarkOverlays();
            this.updateWatermarkControls();
            this.updateSettingsUI();
            if (this.currentImageIndex >= 0) {
                await this.updatePreview();
            }
            
            const watermarkCount = this.watermarks.length;
            this.showNotification(`Loaded template: ${template.name} (${watermarkCount} watermark${watermarkCount !== 1 ? 's' : ''})`, 'success');
        } catch (error) {
            console.error('Error loading selected template:', error);
            this.showNotification('Failed to load selected template', 'error');
        }
    }

    updateSettingsUI() {
        const settings = this.watermarkSettings;
        
        this.switchWatermarkType(settings.type);
        
        const elements = {
            'watermarkText': settings.text.content,
            'textFont': settings.text.font,
            'textSize': settings.text.size,
            'textColor': settings.text.color,
            'textOpacity': settings.text.opacity,
            'imageOpacity': settings.image.opacity,
            'outputFormat': settings.output.format,
            'outputQuality': settings.output.quality
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        const displays = {
            'textSizeValue': `${settings.text.size}px`,
            'textOpacityValue': `${settings.text.opacity}%`,
            'imageOpacityValue': `${settings.image.opacity}%`,
            'outputQualityValue': `${settings.output.quality}%`
        };

        Object.entries(displays).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    zoomIn() {
        this.zoom = Math.min(this.zoom * 1.2, 3);
        this.updateZoomDisplay();
        this.updatePreview();
    }

    zoomOut() {
        this.zoom = Math.max(this.zoom / 1.2, 0.2);
        this.updateZoomDisplay();
        this.updatePreview();
    }

    fitToScreen() {
        this.zoom = 1;
        this.updateZoomDisplay();
        this.updatePreview();
    }

    updateZoomDisplay() {
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) {
            zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
        }
    }

    showProgress(show) {
        const container = document.getElementById('progressContainer');
        if (container) {
            container.classList.toggle('hidden', !show);
            if (!show) {
                const progressBar = document.getElementById('progressBar');
                if (progressBar) progressBar.style.width = '0%';
            }
        }
    }

    updateProgress(percent, message) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) progressBar.style.width = `${percent}%`;
        if (progressPercent) progressPercent.textContent = `${percent}%`;
        if (progressText) progressText.textContent = message;
    }

    showLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.remove('hidden');
    }

    hideLoading() {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) spinner.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;
        
        const toast = document.createElement('div');
        
        const icons = {
            success: 'fas fa-check-circle text-green-500',
            error: 'fas fa-exclamation-circle text-red-500',
            warning: 'fas fa-exclamation-triangle text-yellow-500',
            info: 'fas fa-info-circle text-blue-500'
        };

        const borderColors = {
            success: 'border-l-green-500',
            error: 'border-l-red-500',
            warning: 'border-l-yellow-500',
            info: 'border-l-blue-500'
        };

        toast.className = `toast rounded-lg shadow-lg border-l-4 ${borderColors[type]} p-4 flex items-center gap-3 mb-2`;
        toast.innerHTML = `
            <i class="${icons[type]}"></i>
            <span class="flex-1">${message}</span>
            <button class="toast-close text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;

        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.remove();
        });

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, 5000);
    }

    showError(title, message) {
        this.showNotification(`${title}: ${message}`, 'error');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

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
}

// Initialize the application
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded, initializing Enhanced WatermarkPro...');
        window.app = new WatermarkApp();
    });
} else {
    console.log('DOM already ready, initializing Enhanced WatermarkPro...');
    window.app = new WatermarkApp();
}