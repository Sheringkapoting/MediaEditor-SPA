describe('BatchProcessor', () => {
    let batchProcessor;
    let mockImage;
    let mockSettings;

    beforeEach(() => {
        batchProcessor = new BatchProcessor();
        
        mockImage = {
            id: 'test-1',
            name: 'test.jpg',
            size: 100000,
            imageData: {
                width: 800,
                height: 600,
                element: new Image()
            }
        };

        mockSettings = {
            type: 'text',
            text: {
                content: 'Test Watermark',
                font: 'Arial',
                size: 48,
                color: '#ffffff',
                opacity: 80
            },
            position: { preset: 'center', x: 0, y: 0 },
            output: { format: 'png', quality: 95 }
        };
    });

    it('should initialize correctly', () => {
        expect(batchProcessor.processingQueue).toEqual([]);
        expect(batchProcessor.isProcessing).toBeFalsy();
        expect(batchProcessor.results).toEqual([]);
        expect(batchProcessor.errors).toEqual([]);
    });

    it('should add images to queue', () => {
        const ids = batchProcessor.addToQueue([mockImage], mockSettings);
        
        expect(ids.length).toBe(1);
        expect(batchProcessor.processingQueue.length).toBe(1);
        expect(batchProcessor.processingQueue[0].image).toEqual(mockImage);
    });

    it('should get queue status', () => {
        batchProcessor.addToQueue([mockImage], mockSettings);
        const status = batchProcessor.getQueueStatus();
        
        expect(status.total).toBe(1);
        expect(status.pending).toBe(1);
        expect(status.completed).toBe(0);
        expect(status.failed).toBe(0);
        expect(status.isProcessing).toBeFalsy();
    });

    it('should clear queue', () => {
        batchProcessor.addToQueue([mockImage], mockSettings);
        expect(batchProcessor.processingQueue.length).toBe(1);
        
        batchProcessor.clearQueue();
        expect(batchProcessor.processingQueue.length).toBe(0);
        expect(batchProcessor.results.length).toBe(0);
        expect(batchProcessor.errors.length).toBe(0);
    });

    it('should generate output filename correctly', () => {
        const filename = batchProcessor.generateOutputFilename('test.jpg', mockSettings);
        expect(filename).toContain('test_watermarked_');
        expect(filename).toContain('.png');
    });

    it('should estimate data URL size', () => {
        const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        const size = batchProcessor.estimateDataUrlSize(dataUrl);
        expect(size).toBeGreaterThan(0);
        expect(typeof size).toBe('number');
    });

    it('should calculate compression ratio', () => {
        batchProcessor.results = [
            { originalSize: 1000, processedSize: 800 },
            { originalSize: 2000, processedSize: 1400 }
        ];
        
        const ratio = batchProcessor.calculateCompressionRatio();
        expect(ratio).toBeCloseTo(0.733, 2);
    });

    it('should get processing statistics', () => {
        batchProcessor.results = [mockImage];
        batchProcessor.errors = ['error1'];
        
        const stats = batchProcessor.getStatistics();
        expect(stats.totalProcessed).toBe(1);
        expect(stats.totalErrors).toBe(1);
        expect(typeof stats.averageProcessingTime).toBe('number');
    });

    it('should optimize settings based on image characteristics', () => {
        const images = [mockImage];
        const optimized = batchProcessor.optimizeSettings(images, mockSettings);
        
        expect(optimized.length).toBe(1);
        expect(optimized[0].image).toEqual(mockImage);
        expect(optimized[0].settings.type).toBe('text');
    });

    it('should handle progress callbacks', () => {
        let progressCalled = false;
        let progressData = null;
        
        batchProcessor.setProgressCallback((data) => {
            progressCalled = true;
            progressData = data;
        });
        
        batchProcessor.reportProgress(1, 2, 'Test message');
        
        expect(progressCalled).toBeTruthy();
        expect(progressData.current).toBe(1);
        expect(progressData.total).toBe(2);
        expect(progressData.percent).toBe(50);
        expect(progressData.message).toBe('Test message');
    });
});
