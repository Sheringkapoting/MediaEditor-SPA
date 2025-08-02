describe('Utils', () => {
    it('should format file sizes correctly', () => {
        expect(Utils.formatFileSize(0)).toBe('0 Bytes');
        expect(Utils.formatFileSize(1024)).toBe('1 KB');
        expect(Utils.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(Utils.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        expect(Utils.formatFileSize(1536)).toBe('1.5 KB');
    });

    it('should generate unique IDs', () => {
        const id1 = Utils.generateId();
        const id2 = Utils.generateId('test');
        
        expect(id1).not.toBe(id2);
        expect(id1).toContain('id_');
        expect(id2).toContain('test_');
    });

    it('should validate email addresses', () => {
        expect(Utils.isValidEmail('test@example.com')).toBeTruthy();
        expect(Utils.isValidEmail('user.name+tag@domain.co.uk')).toBeTruthy();
        expect(Utils.isValidEmail('invalid-email')).toBeFalsy();
        expect(Utils.isValidEmail('test@')).toBeFalsy();
        expect(Utils.isValidEmail('@example.com')).toBeFalsy();
    });

    it('should convert hex to RGB', () => {
        const rgb = Utils.hexToRgb('#FF0000');
        expect(rgb.r).toBe(255);
        expect(rgb.g).toBe(0);
        expect(rgb.b).toBe(0);
        
        expect(Utils.hexToRgb('invalid')).toBeNull();
    });

    it('should convert RGB to hex', () => {
        expect(Utils.rgbToHex(255, 0, 0)).toBe('#ff0000');
        expect(Utils.rgbToHex(0, 255, 0)).toBe('#00ff00');
        expect(Utils.rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    it('should get contrast colors', () => {
        expect(Utils.getContrastColor('#000000')).toBe('#FFFFFF');
        expect(Utils.getContrastColor('#FFFFFF')).toBe('#000000');
        expect(Utils.getContrastColor('#808080')).toBe('#000000');
    });

    it('should clamp values correctly', () => {
        expect(Utils.clamp(5, 0, 10)).toBe(5);
        expect(Utils.clamp(-5, 0, 10)).toBe(0);
        expect(Utils.clamp(15, 0, 10)).toBe(10);
    });

    it('should calculate GCD correctly', () => {
        expect(Utils.gcd(12, 8)).toBe(4);
        expect(Utils.gcd(17, 13)).toBe(1);
        expect(Utils.gcd(100, 25)).toBe(25);
    });

    it('should calculate aspect ratios', () => {
        const ratio = Utils.calculateAspectRatio(1920, 1080);
        expect(ratio.simplified).toBe('16:9');
        expect(ratio.ratio).toBeCloseTo(1.778, 2);
    });

    it('should check numeric values', () => {
        expect(Utils.isNumeric(42)).toBeTruthy();
        expect(Utils.isNumeric('42')).toBeTruthy();
        expect(Utils.isNumeric('42.5')).toBeTruthy();
        expect(Utils.isNumeric('abc')).toBeFalsy();
        expect(Utils.isNumeric(null)).toBeFalsy();
    });

    it('should convert degrees to radians', () => {
        expect(Utils.degToRad(0)).toBe(0);
        expect(Utils.degToRad(90)).toBeCloseTo(Math.PI / 2, 5);
        expect(Utils.degToRad(180)).toBeCloseTo(Math.PI, 5);
        expect(Utils.degToRad(360)).toBeCloseTo(2 * Math.PI, 5);
    });

    it('should convert radians to degrees', () => {
        expect(Utils.radToDeg(0)).toBe(0);
        expect(Utils.radToDeg(Math.PI / 2)).toBeCloseTo(90, 5);
        expect(Utils.radToDeg(Math.PI)).toBeCloseTo(180, 5);
        expect(Utils.radToDeg(2 * Math.PI)).toBeCloseTo(360, 5);
    });

    it('should sanitize HTML', () => {
        expect(Utils.sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
        expect(Utils.sanitizeHtml('Normal text')).toBe('Normal text');
        expect(Utils.sanitizeHtml('<b>Bold</b>')).toBe('&lt;b&gt;Bold&lt;/b&gt;');
    });

    it('should escape regex characters', () => {
        expect(Utils.escapeRegExp('Hello [World]')).toBe('Hello \\[World\\]');
        expect(Utils.escapeRegExp('test.string')).toBe('test\\.string');
        expect(Utils.escapeRegExp('$100')).toBe('\\$100');
    });

    it('should hash strings consistently', () => {
        const hash1 = Utils.hashString('test');
        const hash2 = Utils.hashString('test');
        const hash3 = Utils.hashString('different');
        
        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(typeof hash1).toBe('number');
    });

    it('should perform linear interpolation', () => {
        expect(Utils.lerp(0, 10, 0.5)).toBe(5);
        expect(Utils.lerp(0, 100, 0.25)).toBe(25);
        expect(Utils.lerp(10, 20, 0)).toBe(10);
        expect(Utils.lerp(10, 20, 1)).toBe(20);
    });

    it('should generate random colors', () => {
        const color1 = Utils.randomColor();
        const color2 = Utils.randomColor();
        
        expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color2).toMatch(/^#[0-9a-f]{6}$/i);
        expect(color1).not.toBe(color2);
    });

    it('should deep clone objects', () => {
        const original = {
            a: 1,
            b: { c: 2, d: [3, 4] },
            e: new Date('2023-01-01')
        };
        
        const cloned = Utils.deepClone(original);
        
        expect(cloned).toEqual(original);
        expect(cloned).not.toBe(original);
        expect(cloned.b).not.toBe(original.b);
        expect(cloned.b.d).not.toBe(original.b.d);
        expect(cloned.e).not.toBe(original.e);
    });

    it('should measure text width', () => {
        const width = Utils.measureText('Hello World', '16px Arial');
        expect(typeof width).toBe('number');
        expect(width).toBeGreaterThan(0);
    });

    it('should check device support', () => {
        const support = Utils.checkSupport();
        
        expect(typeof support.canvas).toBe('boolean');
        expect(typeof support.localStorage).toBe('boolean');
        expect(typeof support.fileApi).toBe('boolean');
        expect(typeof support.dragDrop).toBe('boolean');
    });

    it('should format dates correctly', () => {
        const date = new Date('2023-01-15T10:30:00');
        
        const short = Utils.formatDate(date, 'short');
        const long = Utils.formatDate(date, 'long');
        const time = Utils.formatDate(date, 'time');
        
        expect(short).toContain('Jan');
        expect(short).toContain('15');
        expect(short).toContain('2023');
        
        expect(long).toContain('January');
        expect(time).toContain('10:30');
    });
});
