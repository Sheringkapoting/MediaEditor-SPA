describe('ImageProcessor', () => {
    let imageProcessor;

    beforeEach(() => {
        imageProcessor = new ImageProcessor();
    });

    it('should initialize with correct properties', () => {
        expect(imageProcessor.supportedFormats).toBeTruthy();
        expect(imageProcessor.maxFileSize).toBe(50 * 1024 * 1024);
        expect(imageProcessor.canvas).toBeTruthy();
        expect(imageProcessor.ctx).toBeTruthy();
    });

    it('should format file sizes correctly', () => {
        expect(imageProcessor.formatFileSize(0)).toBe('0 Bytes');
        expect(imageProcessor.formatFileSize(1024)).toBe('1 KB');
        expect(imageProcessor.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(imageProcessor.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should validate image quality', () => {
        const goodImage = {
            width: 1920,
            height: 1080,
            size: 500000
        };
        
        const result = imageProcessor.validateImageQuality(goodImage);
        expect(result.isValid).toBeTruthy();
        expect(result.warnings.length).toBe(0);
    });

    it('should detect low resolution images', () => {
        const lowResImage = {
            width: 200,
            height: 150,
            size: 10000
        };
        
        const result = imageProcessor.validateImageQuality(lowResImage);
        expect(result.isValid).toBeFalsy();
        expect(result.warnings.length).toBeGreaterThan(0);
    });
});
