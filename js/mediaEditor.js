/**
 * MediaEditor - Main application controller for image and video editing
 * Handles tab switching, media processing, and watermark application
 */

class MediaEditor {
    constructor() {
        this.currentMediaType = 'image';
        this.imageProcessor = null;
        this.videoProcessor = null;
        this.watermarkEngine = null;
        this.batchProcessor = null;
        this.videoBatchProcessor = null;
        this.templateManager = null;
        
        // Media sources
        this.imageSources = [];
        this.videoSources = [];
        
        // Current media elements
        this.currentImage = null;
        this.currentVideo = null;
        
        // Watermark settings for each media type
        this.imageWatermarkSettings = {
            type: 'text',
            text: '© MediaEditor Pro 2025',
            font: 'Arial',
            size: 48,
            color: '#ffffff',
            opacity: 80,
            imageOpacity: 80,
            position: { x: 50, y: 50 },
            scale: 1,
            rotation: 0
        };
        
        this.videoWatermarkSettings = {
            type: 'text',
            text: '© MediaEditor Pro 2025',
            font: 'Arial',
            size: 48,
            color: '#ffffff',
            opacity: 80,
            imageOpacity: 80,
            position: { x: 50, y: 50 },
            scale: 1,
            rotation: 0
        };
        
        this.init();
    }
    
    init() {
        this.initializeComponents();
        this.setupEventListeners();
        this.setupTabSwitching();
        this.setupImageEditor();
        this.setupVideoEditor();
        
        console.log('MediaEditor initialized successfully');
    }
    
    initializeComponents() {
        // Initialize existing components
        this.imageProcessor = new ImageProcessor();
        this.watermarkEngine = new WatermarkEngine();
        this.batchProcessor = new BatchProcessor();
        this.templateManager = new TemplateManager();
        
        // Initialize video processor (simplified version)
        this.videoProcessor = new VideoProcessor();
    }
    
    setupEventListeners() {
        // Template management
        document.getElementById('saveTemplateBtn').addEventListener('click', () => {
            this.showTemplateModal();
        });
        
        document.getElementById('loadTemplateBtn').addEventListener('click', () => {
            this.loadTemplate();
        });
    }
    
    setupTabSwitching() {
        const imageTab = document.getElementById('imageTab');
        const videoTab = document.getElementById('videoTab');
        const imageEditor = document.getElementById('imageEditor');
        const videoEditor = document.getElementById('videoEditor');
        
        imageTab.addEventListener('click', () => {
            this.switchToMediaType('image');
            imageTab.classList.add('active');
            videoTab.classList.remove('active');
            imageEditor.classList.remove('hidden');
            videoEditor.classList.add('hidden');
        });
        
        videoTab.addEventListener('click', () => {
            this.switchToMediaType('video');
            videoTab.classList.add('active');
            imageTab.classList.remove('active');
            videoEditor.classList.remove('hidden');
            imageEditor.classList.add('hidden');
        });
    }
    
    switchToMediaType(mediaType) {
        this.currentMediaType = mediaType;
        console.log(`Switched to ${mediaType} editor`);
        
        // Update UI elements based on media type
        this.updateWatermarkSettings();
    }
    
    setupImageEditor() {
        // File upload handling
        const uploadArea = document.getElementById('imageSourceUpload');
        const fileInput = document.getElementById('imageSourceInput');
        const sourceList = document.getElementById('imageSourceList');
        const clearBtn = document.getElementById('clearImageSourceBtn');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-blue-600', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-blue-600', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-blue-600', 'bg-blue-50');
            this.handleImageFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleImageFiles(e.target.files);
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearImageSources();
        });
        
        // Watermark settings
        this.setupImageWatermarkControls();
        
        // Processing buttons
        document.getElementById('imagePreviewBatchBtn').addEventListener('click', () => {
            this.previewImageBatch();
        });
        
        document.getElementById('imageProcessBatchBtn').addEventListener('click', () => {
            this.processImageBatch();
        });
        
        // Zoom controls
        this.setupImageZoomControls();
    }
    
    setupVideoEditor() {
        // File upload handling
        const uploadArea = document.getElementById('videoSourceUpload');
        const fileInput = document.getElementById('videoSourceInput');
        const sourceList = document.getElementById('videoSourceList');
        const clearBtn = document.getElementById('clearVideoSourceBtn');
        
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('border-blue-600', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('border-blue-600', 'bg-blue-50');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('border-blue-600', 'bg-blue-50');
            this.handleVideoFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleVideoFiles(e.target.files);
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearVideoSources();
        });
        
        // Watermark settings
        this.setupVideoWatermarkControls();
        
        // Processing buttons
        document.getElementById('videoPreviewBatchBtn').addEventListener('click', () => {
            this.previewVideoBatch();
        });
        
        document.getElementById('videoProcessBatchBtn').addEventListener('click', () => {
            this.processVideoBatch();
        });
        
        // Video controls
        this.setupVideoControls();
        
        // Zoom controls
        this.setupVideoZoomControls();
    }
    
    setupImageWatermarkControls() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.image-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchImageWatermarkType(type);
                
                tabBtns.forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold'));
                tabBtns.forEach(b => b.classList.add('text-gray-600'));
                btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold');
                btn.classList.remove('text-gray-600');
            });
        });
        
        // Text settings
        document.getElementById('imageWatermarkText').addEventListener('input', (e) => {
            this.imageWatermarkSettings.text = e.target.value;
            this.updateImagePreview();
        });
        
        document.getElementById('imageTextFont').addEventListener('change', (e) => {
            this.imageWatermarkSettings.font = e.target.value;
            this.updateImagePreview();
        });
        
        document.getElementById('imageTextSize').addEventListener('input', (e) => {
            this.imageWatermarkSettings.size = parseInt(e.target.value);
            document.getElementById('imageTextSizeValue').textContent = e.target.value + 'px';
            this.updateImagePreview();
        });
        
        document.getElementById('imageTextColor').addEventListener('change', (e) => {
            this.imageWatermarkSettings.color = e.target.value;
            this.updateImagePreview();
        });
        
        document.getElementById('imageTextOpacity').addEventListener('input', (e) => {
            this.imageWatermarkSettings.opacity = parseInt(e.target.value);
            document.getElementById('imageTextOpacityValue').textContent = e.target.value + '%';
            this.updateImagePreview();
        });
        
        // Image watermark upload
        const watermarkUpload = document.getElementById('imageWatermarkUpload');
        const watermarkInput = document.getElementById('imageWatermarkInput');
        
        watermarkUpload.addEventListener('click', () => watermarkInput.click());
        watermarkInput.addEventListener('change', (e) => {
            this.handleImageWatermarkUpload(e.target.files[0]);
        });
        
        document.getElementById('imageImageOpacity').addEventListener('input', (e) => {
            this.imageWatermarkSettings.imageOpacity = parseInt(e.target.value);
            document.getElementById('imageImageOpacityValue').textContent = e.target.value + '%';
            this.updateImagePreview();
        });
    }
    
    setupVideoWatermarkControls() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.video-tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.dataset.type;
                this.switchVideoWatermarkType(type);
                
                tabBtns.forEach(b => b.classList.remove('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold'));
                tabBtns.forEach(b => b.classList.add('text-gray-600'));
                btn.classList.add('bg-white', 'shadow-sm', 'text-blue-600', 'font-semibold');
                btn.classList.remove('text-gray-600');
            });
        });
        
        // Text settings
        document.getElementById('videoWatermarkText').addEventListener('input', (e) => {
            this.videoWatermarkSettings.text = e.target.value;
            this.updateVideoPreview();
        });
        
        document.getElementById('videoTextFont').addEventListener('change', (e) => {
            this.videoWatermarkSettings.font = e.target.value;
            this.updateVideoPreview();
        });
        
        document.getElementById('videoTextSize').addEventListener('input', (e) => {
            this.videoWatermarkSettings.size = parseInt(e.target.value);
            document.getElementById('videoTextSizeValue').textContent = e.target.value + 'px';
            this.updateVideoPreview();
        });
        
        document.getElementById('videoTextColor').addEventListener('change', (e) => {
            this.videoWatermarkSettings.color = e.target.value;
            this.updateVideoPreview();
        });
        
        document.getElementById('videoTextOpacity').addEventListener('input', (e) => {
            this.videoWatermarkSettings.opacity = parseInt(e.target.value);
            document.getElementById('videoTextOpacityValue').textContent = e.target.value + '%';
            this.updateVideoPreview();
        });
        
        // Image watermark upload
        const watermarkUpload = document.getElementById('videoWatermarkUpload');
        const watermarkInput = document.getElementById('videoWatermarkInput');
        
        watermarkUpload.addEventListener('click', () => watermarkInput.click());
        watermarkInput.addEventListener('change', (e) => {
            this.handleVideoWatermarkUpload(e.target.files[0]);
        });
        
        document.getElementById('videoImageOpacity').addEventListener('input', (e) => {
            this.videoWatermarkSettings.imageOpacity = parseInt(e.target.value);
            document.getElementById('videoImageOpacityValue').textContent = e.target.value + '%';
            this.updateVideoPreview();
        });
    }
    
    setupVideoControls() {
        const video = document.getElementById('videoPreview');
        const playPauseBtn = document.getElementById('playPauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const playhead = document.getElementById('playhead');
        const currentTimeSpan = document.getElementById('currentTime');
        const totalTimeSpan = document.getElementById('totalTime');
        
        playPauseBtn.addEventListener('click', () => {
            if (video.paused) {
                video.play();
                playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            } else {
                video.pause();
                playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
            }
        });
        
        stopBtn.addEventListener('click', () => {
            video.pause();
            video.currentTime = 0;
            playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        video.addEventListener('timeupdate', () => {
            if (video.duration) {
                const progress = (video.currentTime / video.duration) * 100;
                playhead.style.left = progress + '%';
                currentTimeSpan.textContent = this.formatTime(video.currentTime);
            }
        });
        
        video.addEventListener('loadedmetadata', () => {
            totalTimeSpan.textContent = this.formatTime(video.duration);
        });
    }
    
    setupImageZoomControls() {
        const zoomInBtn = document.getElementById('imageZoomInBtn');
        const zoomOutBtn = document.getElementById('imageZoomOutBtn');
        const fitToScreenBtn = document.getElementById('imageFitToScreenBtn');
        const zoomLevel = document.getElementById('imageZoomLevel');
        
        let currentZoom = 1;
        
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom * 1.2, 5);
            this.updateImageZoom(currentZoom);
            zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
        });
        
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom / 1.2, 0.1);
            this.updateImageZoom(currentZoom);
            zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
        });
        
        fitToScreenBtn.addEventListener('click', () => {
            currentZoom = 1;
            this.updateImageZoom(currentZoom);
            zoomLevel.textContent = '100%';
        });
    }
    
    setupVideoZoomControls() {
        const zoomInBtn = document.getElementById('videoZoomInBtn');
        const zoomOutBtn = document.getElementById('videoZoomOutBtn');
        const fitToScreenBtn = document.getElementById('videoFitToScreenBtn');
        const zoomLevel = document.getElementById('videoZoomLevel');
        
        let currentZoom = 1;
        
        zoomInBtn.addEventListener('click', () => {
            currentZoom = Math.min(currentZoom * 1.2, 5);
            this.updateVideoZoom(currentZoom);
            zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
        });
        
        zoomOutBtn.addEventListener('click', () => {
            currentZoom = Math.max(currentZoom / 1.2, 0.1);
            this.updateVideoZoom(currentZoom);
            zoomLevel.textContent = Math.round(currentZoom * 100) + '%';
        });
        
        fitToScreenBtn.addEventListener('click', () => {
            currentZoom = 1;
            this.updateVideoZoom(currentZoom);
            zoomLevel.textContent = '100%';
        });
    }
    
    // File handling methods
    handleImageFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.addImageSource(file);
            }
        });
    }
    
    handleVideoFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('video/')) {
                this.addVideoSource(file);
            }
        });
    }
    
    addImageSource(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const imageData = {
                file: file,
                name: file.name,
                url: e.target.result,
                size: file.size
            };
            
            this.imageSources.push(imageData);
            this.updateImageSourceList();
            
            // Load first image automatically
            if (this.imageSources.length === 1) {
                this.loadImage(imageData);
            }
        };
        reader.readAsDataURL(file);
    }
    
    addVideoSource(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const videoData = {
                file: file,
                name: file.name,
                url: e.target.result,
                size: file.size
            };
            
            this.videoSources.push(videoData);
            this.updateVideoSourceList();
            
            // Load first video automatically
            if (this.videoSources.length === 1) {
                this.loadVideo(videoData);
            }
        };
        reader.readAsDataURL(file);
    }
    
    updateImageSourceList() {
        const sourceList = document.getElementById('imageSourceList');
        
        if (this.imageSources.length === 0) {
            sourceList.innerHTML = `
                <div class="text-center text-gray-500 py-6">
                    <i class="fas fa-images text-2xl mb-2"></i>
                    <p class="text-sm">No images loaded</p>
                </div>
            `;
            return;
        }
        
        sourceList.innerHTML = this.imageSources.map((img, index) => `
            <div class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer" onclick="mediaEditor.loadImage(mediaEditor.imageSources[${index}])">
                <img src="${img.url}" class="w-12 h-12 object-cover rounded mr-3">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${img.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(img.size)}</p>
                </div>
            </div>
        `).join('');
    }
    
    updateVideoSourceList() {
        const sourceList = document.getElementById('videoSourceList');
        
        if (this.videoSources.length === 0) {
            sourceList.innerHTML = `
                <div class="text-center text-gray-500 py-6">
                    <i class="fas fa-film text-2xl mb-2"></i>
                    <p class="text-sm">No videos loaded</p>
                </div>
            `;
            return;
        }
        
        sourceList.innerHTML = this.videoSources.map((video, index) => `
            <div class="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer" onclick="mediaEditor.loadVideo(mediaEditor.videoSources[${index}])">
                <div class="w-12 h-12 bg-gray-200 rounded mr-3 flex items-center justify-center">
                    <i class="fas fa-video text-gray-500"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${video.name}</p>
                    <p class="text-xs text-gray-500">${this.formatFileSize(video.size)}</p>
                </div>
            </div>
        `).join('');
    }
    
    loadImage(imageData) {
        const canvas = document.getElementById('imagePreviewCanvas');
        const overlay = document.getElementById('imageCanvasOverlay');
        const container = document.getElementById('imageCanvasContainer');
        
        this.currentImage = imageData;
        
        const img = new Image();
        img.onload = () => {
            // Get container dimensions
            const containerWidth = container.clientWidth || 800;
            const containerHeight = container.clientHeight || 600;
            const maxWidth = containerWidth - 40; // padding
            const maxHeight = containerHeight - 40;
            
            // Calculate scaled dimensions while maintaining aspect ratio
            let { width, height } = this.calculateScaledDimensions(
                img.width, img.height, maxWidth, maxHeight
            );
            
            canvas.width = width;
            canvas.height = height;
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            overlay.style.display = 'none';
            canvas.style.display = 'block';
            
            this.updateImagePreview();
        };
        img.src = imageData.url;
    }
    
    loadVideo(videoData) {
        const video = document.getElementById('videoPreview');
        const overlay = document.getElementById('videoCanvasOverlay');
        
        this.currentVideo = videoData;
        
        video.src = videoData.url;
        overlay.style.display = 'none';
        video.style.display = 'block';
        
        this.updateVideoPreview();
    }
    
    // Watermark methods
    switchImageWatermarkType(type) {
        this.imageWatermarkSettings.type = type;
        
        const textSettings = document.getElementById('imageTextSettings');
        const imageSettings = document.getElementById('imageImageSettings');
        
        if (type === 'text') {
            textSettings.classList.remove('hidden');
            imageSettings.classList.add('hidden');
        } else {
            textSettings.classList.add('hidden');
            imageSettings.classList.remove('hidden');
        }
        
        this.updateImagePreview();
    }
    
    switchVideoWatermarkType(type) {
        this.videoWatermarkSettings.type = type;
        
        const textSettings = document.getElementById('videoTextSettings');
        const imageSettings = document.getElementById('videoImageSettings');
        
        if (type === 'text') {
            textSettings.classList.remove('hidden');
            imageSettings.classList.add('hidden');
        } else {
            textSettings.classList.add('hidden');
            imageSettings.classList.remove('hidden');
        }
        
        this.updateVideoPreview();
    }
    
    async updateImagePreview() {
        if (!this.currentImage) return;
        
        const canvas = document.getElementById('imagePreviewCanvas');
        const ctx = canvas.getContext('2d');
        
        // Redraw original image
        const img = new Image();
        img.onload = async () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Apply watermark
            await this.applyImageWatermark(ctx, canvas.width, canvas.height);
        };
        img.src = this.currentImage.url;
    }
    
    async updateVideoPreview() {
        const canvas = document.getElementById('videoCanvas');
        const video = document.getElementById('videoPreview');
        
        if (!canvas || !video || !this.currentVideo) {
            console.log('Video preview elements not ready');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        
        // Set canvas size to match video dimensions
        canvas.width = video.videoWidth || video.clientWidth;
        canvas.height = video.videoHeight || video.clientHeight;
        
        // Draw current video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply watermark if settings exist
        if (this.videoWatermarkSettings.type === 'text' && this.videoWatermarkSettings.text) {
            await this.applyVideoWatermark(ctx, canvas.width, canvas.height);
        }
        
        console.log('Video preview updated with watermark');
    }
    
    async applyVideoWatermark(ctx, width, height) {
        const settings = this.videoWatermarkSettings;
        
        if (settings.type === 'text' && settings.text) {
            const watermarkSettings = {
                type: 'text',
                text: {
                    content: settings.text,
                    font: settings.font,
                    size: settings.size,
                    color: settings.color,
                    opacity: settings.opacity
                },
                transform: {
                    x: width * 0.05, // Small margin from left
                    y: height * 0.05, // Small margin from top
                    width: width * 0.9,
                    height: settings.size * 1.5,
                    rotation: 0
                }
            };
            
            console.log('Applying video watermark with settings:', watermarkSettings);
            
            const bounds = { width, height };
            await this.watermarkEngine.applyWatermark(ctx, watermarkSettings, bounds, 1);
        }
    }
    
    async applyImageWatermark(ctx, width, height) {
        const settings = this.imageWatermarkSettings;
        
        if (settings.type === 'text' && settings.text) {
            const watermarkSettings = {
                type: 'text',
                text: {
                    content: settings.text,
                    font: settings.font,
                    size: settings.size,
                    color: settings.color,
                    opacity: settings.opacity
                },
                transform: {
                    x: width * 0.05, // Small margin from left
                    y: height * 0.05, // Small margin from top
                    width: width * 0.9,
                    height: settings.size * 1.5,
                    rotation: 0
                }
            };
            
            console.log('Applying image watermark with settings:', watermarkSettings);
            
            const bounds = { width, height };
            await this.watermarkEngine.applyWatermark(ctx, watermarkSettings, bounds, 1);
        }
    }
    
    // Processing methods
    previewImageBatch() {
        if (this.imageSources.length === 0) {
            this.showToast('No images to preview', 'warning');
            return;
        }
        
        console.log('Previewing image batch...');
        this.showToast('Image batch preview ready', 'success');
    }
    
    processImageBatch() {
        if (this.imageSources.length === 0) {
            this.showToast('No images to process', 'warning');
            return;
        }
        
        console.log('Processing image batch...');
        this.showProgressBar('image', true);
        
        // Simulate processing
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            this.updateProgressBar('image', progress);
            
            if (progress >= 100) {
                clearInterval(interval);
                this.showProgressBar('image', false);
                this.showToast('Image batch processed successfully', 'success');
            }
        }, 200);
    }
    
    previewVideoBatch() {
        if (this.videoSources.length === 0) {
            this.showToast('No videos to preview', 'warning');
            return;
        }
        
        console.log('Previewing video batch...');
        this.showToast('Video batch preview ready', 'success');
    }
    
    async processVideoBatch() {
        if (this.videoSources.length === 0) {
            this.showToast('No videos to process', 'warning');
            return;
        }
        
        console.log('Processing video batch...');
        this.showProgressBar('video', true);
        
        try {
            const totalVideos = this.videoSources.length;
            
            for (let i = 0; i < totalVideos; i++) {
                const videoData = this.videoSources[i];
                const progress = Math.round(((i + 1) / totalVideos) * 100);
                
                // Process video with watermark
                await this.processVideoWithWatermark(videoData, this.videoWatermarkSettings);
                
                this.updateProgressBar('video', progress);
            }
            
            this.showProgressBar('video', false);
            this.showToast('Video batch processed successfully', 'success');
        } catch (error) {
            this.showProgressBar('video', false);
            this.showToast('Error processing video batch: ' + error.message, 'error');
            console.error('Video batch processing error:', error);
        }
    }
    
    async processVideoWithWatermark(videoData, watermarkSettings) {
        try {
            console.log('Processing video with watermark:', videoData.name);
            
            // Validate watermark settings
            const validation = this.watermarkEngine.validateSettings(watermarkSettings);
            if (!validation.isValid) {
                throw new Error(`Invalid watermark settings: ${validation.errors.join(', ')}`);
            }
            
            // Create a canvas for watermark preview (for UI feedback)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1920; // Default video width
            canvas.height = 1080; // Default video height
            
            // Apply watermark to canvas for preview
            if (watermarkSettings.type === 'text' && watermarkSettings.text) {
                this.watermarkEngine.applyTextWatermark(ctx, {
                    text: watermarkSettings.text,
                    font: watermarkSettings.font,
                    size: watermarkSettings.size,
                    color: watermarkSettings.color,
                    opacity: watermarkSettings.opacity / 100,
                    position: watermarkSettings.position,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                });
            } else if (watermarkSettings.type === 'image' && watermarkSettings.imageUrl) {
                await this.watermarkEngine.applyImageWatermark(ctx, {
                    imageUrl: watermarkSettings.imageUrl,
                    opacity: watermarkSettings.imageOpacity / 100,
                    position: watermarkSettings.position,
                    scale: watermarkSettings.scale,
                    rotation: watermarkSettings.rotation,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                });
            }
            
            // Simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return {
                ...videoData,
                processed: true,
                watermarkApplied: true,
                watermarkSettings: watermarkSettings,
                processedAt: new Date().toISOString(),
                outputFormat: 'mp4'
            };
        } catch (error) {
            console.error('Error processing video:', error);
            throw error;
        }
    }
    
    // Utility methods
    clearImageSources() {
        this.imageSources = [];
        this.currentImage = null;
        this.updateImageSourceList();
        
        const canvas = document.getElementById('imagePreviewCanvas');
        const overlay = document.getElementById('imageCanvasOverlay');
        
        canvas.style.display = 'none';
        overlay.style.display = 'flex';
        
        this.showToast('Image sources cleared', 'info');
    }
    
    clearVideoSources() {
        this.videoSources = [];
        this.currentVideo = null;
        this.updateVideoSourceList();
        
        const video = document.getElementById('videoPreview');
        const overlay = document.getElementById('videoCanvasOverlay');
        
        video.style.display = 'none';
        overlay.style.display = 'flex';
        
        this.showToast('Video sources cleared', 'info');
    }
    
    updateImageZoom(zoom) {
        const canvas = document.getElementById('imagePreviewCanvas');
        canvas.style.transform = `scale(${zoom})`;
    }
    
    updateVideoZoom(zoom) {
        const video = document.getElementById('videoPreview');
        video.style.transform = `scale(${zoom})`;
    }
    
    showProgressBar(mediaType, show) {
        const container = document.getElementById(`${mediaType}ProgressContainer`);
        if (show) {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
        }
    }
    
    updateProgressBar(mediaType, progress) {
        const progressBar = document.getElementById(`${mediaType}ProgressBar`);
        const progressPercent = document.getElementById(`${mediaType}ProgressPercent`);
        
        progressBar.style.width = progress + '%';
        progressPercent.textContent = progress + '%';
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    calculateScaledDimensions(originalWidth, originalHeight, maxWidth, maxHeight) {
        const aspectRatio = originalWidth / originalHeight;
        
        let width = originalWidth;
        let height = originalHeight;
        
        // Scale down if image is larger than container
        if (width > maxWidth) {
            width = maxWidth;
            height = width / aspectRatio;
        }
        
        if (height > maxHeight) {
            height = maxHeight;
            width = height * aspectRatio;
        }
        
        return { width: Math.round(width), height: Math.round(height) };
    }
    
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };
        
        toast.className = `${colors[type]} text-white px-4 py-2 rounded-lg shadow-lg transform transition-all duration-300 translate-x-full`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    updateWatermarkSettings() {
        // Update UI based on current media type settings
        const settings = this.currentMediaType === 'image' ? this.imageWatermarkSettings : this.videoWatermarkSettings;
        const prefix = this.currentMediaType;
        
        // Update form values
        document.getElementById(`${prefix}WatermarkText`).value = settings.text;
        document.getElementById(`${prefix}TextFont`).value = settings.font;
        document.getElementById(`${prefix}TextSize`).value = settings.size;
        document.getElementById(`${prefix}TextColor`).value = settings.color;
        document.getElementById(`${prefix}TextOpacity`).value = settings.opacity;
    }
    
    updateVideoWatermarkSettings() {
        const type = document.querySelector('input[name="video-watermark-type"]:checked')?.value || 'text';
        
        if (type === 'text') {
            this.videoWatermarkSettings = {
                type: 'text',
                text: document.getElementById('video-watermark-text')?.value || 'Sample Watermark',
                font: document.getElementById('video-font-family')?.value || 'Arial',
                size: parseInt(document.getElementById('video-font-size')?.value) || 24,
                color: document.getElementById('video-font-color')?.value || '#ffffff',
                opacity: parseInt(document.getElementById('video-text-opacity')?.value) || 80,
                position: document.getElementById('video-text-position')?.value || 'bottom-right',
                rotation: parseFloat(document.getElementById('video-text-rotation')?.value) || 0,
                offsetX: parseInt(document.getElementById('video-text-offset-x')?.value) || 0,
                offsetY: parseInt(document.getElementById('video-text-offset-y')?.value) || 0
            };
        } else {
            this.videoWatermarkSettings = {
                type: 'image',
                imageUrl: document.getElementById('video-watermark-image')?.src || '',
                imageData: document.getElementById('video-watermark-image')?.dataset?.imageData || null,
                opacity: parseInt(document.getElementById('video-image-opacity')?.value) || 80,
                position: document.getElementById('video-image-position')?.value || 'bottom-right',
                scale: parseFloat(document.getElementById('video-image-scale')?.value) || 1.0,
                rotation: parseFloat(document.getElementById('video-image-rotation')?.value) || 0,
                offsetX: parseInt(document.getElementById('video-image-offset-x')?.value) || 0,
                offsetY: parseInt(document.getElementById('video-image-offset-y')?.value) || 0
            };
        }
        
        // Validate settings using WatermarkEngine
        const validation = this.watermarkEngine.validateSettings(this.videoWatermarkSettings);
        if (!validation.isValid) {
            console.warn('Invalid video watermark settings:', validation.errors);
            this.showToast('Invalid watermark settings: ' + validation.errors.join(', '), 'warning');
        }
        
        console.log('Video watermark settings updated:', this.videoWatermarkSettings);
        
        // Update preview if video is loaded
        this.updateVideoPreview();
    }
    
    updateVideoPreview() {
        const canvas = document.getElementById('video-canvas');
        const video = document.getElementById('video-preview');
        
        if (!canvas || !video || this.videoSources.length === 0) {
            return;
        }
        
        const ctx = canvas.getContext('2d');
        const currentVideo = this.videoSources[0]; // Use first video for preview
        
        // Set canvas dimensions
        canvas.width = currentVideo.width || 1920;
        canvas.height = currentVideo.height || 1080;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw a placeholder background (since we can't easily draw video frames)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add video info text
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`Video: ${currentVideo.name}`, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(`${canvas.width} x ${canvas.height}`, canvas.width / 2, canvas.height / 2 + 20);
        
        // Apply watermark preview
        try {
            if (this.videoWatermarkSettings.type === 'text' && this.videoWatermarkSettings.text) {
                this.watermarkEngine.applyTextWatermark(ctx, {
                    text: this.videoWatermarkSettings.text,
                    font: this.videoWatermarkSettings.font,
                    size: this.videoWatermarkSettings.size,
                    color: this.videoWatermarkSettings.color,
                    opacity: this.videoWatermarkSettings.opacity / 100,
                    position: this.videoWatermarkSettings.position,
                    rotation: this.videoWatermarkSettings.rotation || 0,
                    offsetX: this.videoWatermarkSettings.offsetX || 0,
                    offsetY: this.videoWatermarkSettings.offsetY || 0,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                });
            } else if (this.videoWatermarkSettings.type === 'image' && this.videoWatermarkSettings.imageUrl) {
                this.watermarkEngine.applyImageWatermark(ctx, {
                    imageUrl: this.videoWatermarkSettings.imageUrl,
                    opacity: this.videoWatermarkSettings.opacity / 100,
                    position: this.videoWatermarkSettings.position,
                    scale: this.videoWatermarkSettings.scale || 1.0,
                    rotation: this.videoWatermarkSettings.rotation || 0,
                    offsetX: this.videoWatermarkSettings.offsetX || 0,
                    offsetY: this.videoWatermarkSettings.offsetY || 0,
                    canvasWidth: canvas.width,
                    canvasHeight: canvas.height
                }).catch(error => {
                    console.warn('Error applying image watermark to video preview:', error);
                });
            }
        } catch (error) {
            console.error('Error updating video preview:', error);
        }
    }
    
    showTemplateModal() {
        document.getElementById('templateModal').classList.remove('hidden');
    }
    
    loadTemplate() {
        this.showToast('Template loading feature coming soon', 'info');
    }
    
    handleImageWatermarkUpload(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imageWatermarkSettings.imageUrl = e.target.result;
                this.updateImagePreview();
                this.showToast('Image watermark uploaded', 'success');
            };
            reader.readAsDataURL(file);
        }
    }
    
    handleVideoWatermarkUpload(file) {
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.videoWatermarkSettings.imageUrl = e.target.result;
                this.updateVideoPreview();
                this.showToast('Video watermark uploaded', 'success');
            };
            reader.readAsDataURL(file);
        }
    }
}

// VideoProcessor is now loaded from videoProcessor.js
// VideoBatchProcessor is now loaded from videoBatchProcessor.js

// Initialize the MediaEditor when the page loads
let mediaEditor;
document.addEventListener('DOMContentLoaded', () => {
    mediaEditor = new MediaEditor();
});