describe('WatermarkEngine', () => {
    let watermarkEngine;
    let mockCanvas;
    let mockContext;

    beforeEach(() => {
        watermarkEngine = new WatermarkEngine();
        mockCanvas = document.createElement('canvas');
        mockContext = mockCanvas.getContext('2d');
        mockCanvas.width = 800;
        mockCanvas.height = 600;
    });

    it('should initialize correctly', () => {
        expect(watermarkEngine.canvas).toBeTruthy();
        expect(watermarkEngine.ctx).toBeTruthy();
        expect(watermarkEngine.tempCanvas).toBeTruthy();
        expect(watermarkEngine.tempCtx).toBeTruthy();
    });

    it('should validate settings correctly', () => {
        const validSettings = {
            type: 'text',
            text: {
                content: 'Test Watermark',
                size: 48,
                opacity: 80
            },
            position: {
                preset: 'center'
            }
        };

        const validation = watermarkEngine.validateSettings(validSettings);
        expect(validation.isValid).toBeTruthy();
        expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid settings', () => {
        const invalidSettings = {
            type: 'invalid',
            text: {
                content: '',
                size: 1000,
                opacity: 150
            }
        };

        const validation = watermarkEngine.validateSettings(invalidSettings);
        expect(validation.isValid).toBeFalsy();
        expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should calculate position correctly', () => {
        const bounds = { x: 0, y: 0, width: 800, height: 600 };
        const watermarkSize = { width: 200, height: 100 };
        const positionSettings = { preset: 'center', x: 0, y: 0 };

        const position = watermarkEngine.calculatePosition(positionSettings, bounds, watermarkSize);
        
        expect(position.x).toBe(400); // Center X
        expect(position.y).toBe(300); // Center Y
    });

    it('should convert hex to RGB correctly', () => {
        const rgb = watermarkEngine.hexToRgb('#FF0000');
        expect(rgb.r).toBe(255);
        expect(rgb.g).toBe(0);
        expect(rgb.b).toBe(0);
    });

    it('should determine contrast color correctly', () => {
        const darkContrast = watermarkEngine.getContrastColor('#000000');
        const lightContrast = watermarkEngine.getContrastColor('#FFFFFF');
        
        expect(darkContrast).toBe('#FFFFFF');
        expect(lightContrast).toBe('#000000');
    });

    it('should estimate text width', () => {
        const textSettings = {
            content: 'Test Text',
            font: 'Arial',
            size: 48
        };

        const width = watermarkEngine.estimateTextWidth(textSettings);
        expect(width).toBeGreaterThan(0);
        expect(typeof width).toBe('number');
    });

    it('should get watermark dimensions', () => {
        const settings = {
            type: 'text',
            text: {
                content: 'Test',
                size: 48
            }
        };

        const dimensions = watermarkEngine.getWatermarkDimensions(settings);
        expect(dimensions.width).toBeGreaterThan(0);
        expect(dimensions.height).toBe(48);
    });

    it('should apply multiple watermarks without error', async () => {
        const bounds = { x: 0, y: 0, width: 800, height: 600 };
        const wmSettings = [
            {
                type: 'text',
                text: {
                    content: 'First',
                    font: 'Arial',
                    size: 20,
                    color: '#000000',
                    opacity: 100,
                    rotation: 0
                },
                position: { preset: 'top-left', x: 0, y: 0 }
            },
            {
                type: 'text',
                text: {
                    content: 'Second',
                    font: 'Arial',
                    size: 20,
                    color: '#000000',
                    opacity: 100,
                    rotation: 0
                },
                position: { preset: 'bottom-right', x: 0, y: 0 }
            }
        ];

        await watermarkEngine.applyWatermarks(mockContext, wmSettings, bounds);
        expect(true).toBe(true);
    });
});
