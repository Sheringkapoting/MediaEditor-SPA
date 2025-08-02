describe('TemplateManager', () => {
    let templateManager;
    let mockSettings;

    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
        templateManager = new TemplateManager();
        
        mockSettings = {
            type: 'text',
            text: {
                content: 'Test Watermark',
                font: 'Arial',
                size: 48,
                color: '#ffffff',
                opacity: 80,
                rotation: 0
            },
            image: {
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
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should initialize correctly', () => {
        expect(templateManager.storageKey).toBe('watermarkpro-templates');
        expect(templateManager.maxTemplates).toBe(50);
        expect(Array.isArray(templateManager.templates)).toBeTruthy();
    });

    it('should validate template settings', () => {
        const validation = templateManager.validateTemplateSettings(mockSettings);
        expect(validation.isValid).toBeTruthy();
        expect(validation.errors.length).toBe(0);
    });

    it('should detect invalid template settings', () => {
        const invalidSettings = {
            type: 'invalid',
            text: { size: 1000, opacity: 150 }
        };
        
        const validation = templateManager.validateTemplateSettings(invalidSettings);
        expect(validation.isValid).toBeFalsy();
        expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should save template correctly', async () => {
        const template = await templateManager.saveTemplate('Test Template', mockSettings);
        
        expect(template.name).toBe('Test Template');
        expect(template.id).toBeTruthy();
        expect(template.settings).toEqual(mockSettings);
        expect(template.created).toBeTruthy();
        expect(template.modified).toBeTruthy();
    });

    it('should load saved template', async () => {
        const savedTemplate = await templateManager.saveTemplate('Test Template', mockSettings);
        const loadedTemplate = await templateManager.loadTemplate(savedTemplate.id);
        
        expect(loadedTemplate.name).toBe('Test Template');
        expect(loadedTemplate.settings).toEqual(mockSettings);
    });

    it('should get all templates', async () => {
        await templateManager.saveTemplate('Template 1', mockSettings);
        await templateManager.saveTemplate('Template 2', mockSettings);
        
        const templates = await templateManager.getTemplates();
        expect(templates.length).toBe(2);
        expect(templates[0].name).toBeTruthy();
        expect(templates[0].preview).toBeTruthy();
    });

    it('should delete template', async () => {
        const template = await templateManager.saveTemplate('Test Template', mockSettings);
        const deleted = await templateManager.deleteTemplate(template.id);
        
        expect(deleted.name).toBe('Test Template');
        
        const templates = await templateManager.getTemplates();
        expect(templates.length).toBe(0);
    });

    it('should duplicate template', async () => {
        const original = await templateManager.saveTemplate('Original', mockSettings);
        const duplicate = await templateManager.duplicateTemplate(original.id, 'Duplicate');
        
        expect(duplicate.name).toBe('Duplicate');
        expect(duplicate.settings).toEqual(mockSettings);
        expect(duplicate.id).not.toBe(original.id);
    });

    it('should search templates', async () => {
        await templateManager.saveTemplate('Logo Template', mockSettings);
        await templateManager.saveTemplate('Text Template', mockSettings);
        
        const searchResults = templateManager.searchTemplates('Logo');
        expect(searchResults.length).toBe(1);
        expect(searchResults[0].name).toBe('Logo Template');
    });

    it('should generate template preview', () => {
        const preview = templateManager.generateTemplatePreview(mockSettings);
        expect(preview).toContain('Text:');
        expect(preview).toContain('Position: center');
        expect(preview).toContain('Format: PNG');
    });

    it('should determine template category', () => {
        const textCategory = templateManager.determineTemplateCategory({ type: 'text' });
        const imageCategory = templateManager.determineTemplateCategory({ type: 'image' });
        const combinedCategory = templateManager.determineTemplateCategory({ type: 'combined' });
        
        expect(textCategory).toBe('Text Watermarks');
        expect(imageCategory).toBe('Image Watermarks');
        expect(combinedCategory).toBe('Combined Watermarks');
    });

    it('should export templates to JSON', async () => {
        await templateManager.saveTemplate('Test Template', mockSettings);
        
        const exported = await templateManager.exportTemplates();
        const exportData = JSON.parse(exported);
        
        expect(exportData.version).toBe('1.0');
        expect(exportData.templates.length).toBe(1);
        expect(exportData.templates[0].name).toBe('Test Template');
    });

    it('should import templates from JSON', async () => {
        const importData = {
            version: '1.0',
            templates: [{
                name: 'Imported Template',
                settings: mockSettings
            }]
        };
        
        const result = await templateManager.importTemplates(JSON.stringify(importData));
        
        expect(result.imported).toBe(1);
        expect(result.errors.length).toBe(0);
        expect(result.templates[0].name).toBe('Imported Template');
    });

    it('should get storage usage', () => {
        const usage = templateManager.getStorageUsage();
        
        expect(typeof usage.used).toBe('number');
        expect(typeof usage.available).toBe('number');
        expect(typeof usage.percentage).toBe('number');
        expect(usage.templateCount).toBe(0);
    });

    it('should clear all templates', async () => {
        await templateManager.saveTemplate('Template 1', mockSettings);
        await templateManager.saveTemplate('Template 2', mockSettings);
        
        expect(templateManager.templates.length).toBe(2);
        
        await templateManager.clearAllTemplates();
        expect(templateManager.templates.length).toBe(0);
    });

    it('should generate unique template IDs', () => {
        const id1 = templateManager.generateTemplateId();
        const id2 = templateManager.generateTemplateId();
        
        expect(id1).not.toBe(id2);
        expect(id1).toContain('tpl_');
        expect(id2).toContain('tpl_');
    });

    it('should clone settings deeply', () => {
        const cloned = templateManager.cloneSettings(mockSettings);
        
        expect(cloned).toEqual(mockSettings);
        expect(cloned).not.toBe(mockSettings);
        expect(cloned.text).not.toBe(mockSettings.text);
    });
});
