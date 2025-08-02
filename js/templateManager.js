/**
 * TemplateManager - Handles saving, loading, and managing watermark templates
 */

class TemplateManager {
    constructor() {
        this.storageKey = 'watermarkpro-templates';
        this.maxTemplates = 50;
        this.templates = this.loadTemplates();
    }

    /**
     * Save a watermark template
     */
    async saveTemplate(name, settings) {
        try {
            if (!name || name.trim() === '') {
                throw new Error('Template name is required');
            }

            const cleanName = name.trim();
            
            // Validate settings
            const validation = this.validateTemplateSettings(settings);
            if (!validation.isValid) {
                throw new Error(`Invalid template settings: ${validation.errors.join(', ')}`);
            }

            // Create template object
            const template = {
                id: this.generateTemplateId(),
                name: cleanName,
                settings: this.cloneSettings(settings),
                created: new Date().toISOString(),
                modified: new Date().toISOString(),
                version: '1.0'
            };

            // Check if template with same name exists
            const existingIndex = this.templates.findIndex(t => t.name === cleanName);
            
            if (existingIndex >= 0) {
                // Update existing template
                template.id = this.templates[existingIndex].id;
                template.created = this.templates[existingIndex].created;
                this.templates[existingIndex] = template;
            } else {
                // Add new template
                this.templates.push(template);
                
                // Limit number of templates
                if (this.templates.length > this.maxTemplates) {
                    this.templates = this.templates
                        .sort((a, b) => new Date(b.modified) - new Date(a.modified))
                        .slice(0, this.maxTemplates);
                }
            }

            // Save to storage
            await this.saveTemplates();

            return template;

        } catch (error) {
            console.error('Error saving template:', error);
            throw new Error(`Failed to save template: ${error.message}`);
        }
    }

    /**
     * Load a template by ID or name
     */
    async loadTemplate(identifier) {
        try {
            if (!identifier) {
                throw new Error('Template identifier is required');
            }

            const template = this.templates.find(t => 
                t.id === identifier || t.name === identifier
            );

            if (!template) {
                throw new Error(`Template not found: ${identifier}`);
            }

            // Update last accessed time
            template.lastAccessed = new Date().toISOString();
            await this.saveTemplates();

            return {
                ...template,
                settings: this.cloneSettings(template.settings)
            };

        } catch (error) {
            console.error('Error loading template:', error);
            throw new Error(`Failed to load template: ${error.message}`);
        }
    }

    /**
     * Get all templates
     */
    async getTemplates() {
        try {
            return this.templates.map(template => ({
                id: template.id,
                name: template.name,
                created: template.created,
                modified: template.modified,
                lastAccessed: template.lastAccessed,
                preview: this.generateTemplatePreview(template.settings)
            }));

        } catch (error) {
            console.error('Error getting templates:', error);
            return [];
        }
    }

    /**
     * Delete a template
     */
    async deleteTemplate(identifier) {
        try {
            const index = this.templates.findIndex(t => 
                t.id === identifier || t.name === identifier
            );

            if (index === -1) {
                throw new Error(`Template not found: ${identifier}`);
            }

            const deletedTemplate = this.templates.splice(index, 1)[0];
            await this.saveTemplates();

            return deletedTemplate;

        } catch (error) {
            console.error('Error deleting template:', error);
            throw new Error(`Failed to delete template: ${error.message}`);
        }
    }

    /**
     * Duplicate a template
     */
    async duplicateTemplate(identifier, newName) {
        try {
            const template = await this.loadTemplate(identifier);
            
            if (!newName) {
                newName = `${template.name} (Copy)`;
            }

            return await this.saveTemplate(newName, template.settings);

        } catch (error) {
            console.error('Error duplicating template:', error);
            throw new Error(`Failed to duplicate template: ${error.message}`);
        }
    }

    /**
     * Export templates to JSON
     */
    async exportTemplates(templateIds = null) {
        try {
            let templatesToExport = this.templates;
            
            if (templateIds && Array.isArray(templateIds)) {
                templatesToExport = this.templates.filter(t => 
                    templateIds.includes(t.id)
                );
            }

            const exportData = {
                version: '1.0',
                exported: new Date().toISOString(),
                templates: templatesToExport
            };

            return JSON.stringify(exportData, null, 2);

        } catch (error) {
            console.error('Error exporting templates:', error);
            throw new Error(`Failed to export templates: ${error.message}`);
        }
    }

    /**
     * Import templates from JSON
     */
    async importTemplates(jsonData, overwrite = false) {
        try {
            const importData = JSON.parse(jsonData);
            
            if (!importData.templates || !Array.isArray(importData.templates)) {
                throw new Error('Invalid template data format');
            }

            const importedTemplates = [];
            const errors = [];

            for (const templateData of importData.templates) {
                try {
                    // Validate template
                    if (!templateData.name || !templateData.settings) {
                        throw new Error('Invalid template structure');
                    }

                    const validation = this.validateTemplateSettings(templateData.settings);
                    if (!validation.isValid) {
                        throw new Error(`Invalid settings: ${validation.errors.join(', ')}`);
                    }

                    // Check for existing template
                    let finalName = templateData.name;
                    if (!overwrite) {
                        let counter = 1;
                        while (this.templates.some(t => t.name === finalName)) {
                            finalName = `${templateData.name} (${counter})`;
                            counter++;
                        }
                    }

                    const importedTemplate = await this.saveTemplate(finalName, templateData.settings);
                    importedTemplates.push(importedTemplate);

                } catch (error) {
                    errors.push({
                        templateName: templateData.name || 'Unknown',
                        error: error.message
                    });
                }
            }

            return {
                imported: importedTemplates.length,
                errors: errors,
                templates: importedTemplates
            };

        } catch (error) {
            console.error('Error importing templates:', error);
            throw new Error(`Failed to import templates: ${error.message}`);
        }
    }

    /**
     * Search templates
     */
    searchTemplates(query) {
        try {
            if (!query || query.trim() === '') {
                return this.templates;
            }

            const searchTerm = query.toLowerCase().trim();
            
            return this.templates.filter(template => 
                template.name.toLowerCase().includes(searchTerm) ||
                this.getTemplateDescription(template).toLowerCase().includes(searchTerm)
            );

        } catch (error) {
            console.error('Error searching templates:', error);
            return [];
        }
    }

    /**
     * Get template categories
     */
    getTemplateCategories() {
        const categories = new Map();
        
        this.templates.forEach(template => {
            const category = this.determineTemplateCategory(template.settings);
            
            if (!categories.has(category)) {
                categories.set(category, []);
            }
            
            categories.get(category).push(template);
        });

        return Object.fromEntries(categories);
    }

    /**
     * Validate template settings
     */
    validateTemplateSettings(settings) {
        const errors = [];

        try {
            // Check required fields
            if (!settings || typeof settings !== 'object') {
                errors.push('Settings must be an object');
                return { isValid: false, errors };
            }

            if (!settings.type || !['text', 'image', 'combined'].includes(settings.type)) {
                errors.push('Invalid watermark type');
            }

            // Validate text settings
            if (settings.text) {
                if (typeof settings.text.size !== 'number' || settings.text.size < 8 || settings.text.size > 500) {
                    errors.push('Invalid text size');
                }
                if (typeof settings.text.opacity !== 'number' || settings.text.opacity < 0 || settings.text.opacity > 100) {
                    errors.push('Invalid text opacity');
                }
            }

            // Validate image settings
            if (settings.image) {
                if (typeof settings.image.scale !== 'number' || settings.image.scale < 1 || settings.image.scale > 500) {
                    errors.push('Invalid image scale');
                }
                if (typeof settings.image.opacity !== 'number' || settings.image.opacity < 0 || settings.image.opacity > 100) {
                    errors.push('Invalid image opacity');
                }
            }

            // Validate position settings
            if (settings.position) {
                const validPositions = [
                    'top-left', 'top-center', 'top-right',
                    'center-left', 'center', 'center-right',
                    'bottom-left', 'bottom-center', 'bottom-right'
                ];
                if (!validPositions.includes(settings.position.preset)) {
                    errors.push('Invalid position preset');
                }
            }

            // Validate output settings
            if (settings.output) {
                const validFormats = ['png', 'jpeg', 'webp'];
                if (!validFormats.includes(settings.output.format)) {
                    errors.push('Invalid output format');
                }
                if (typeof settings.output.quality !== 'number' || settings.output.quality < 1 || settings.output.quality > 100) {
                    errors.push('Invalid output quality');
                }
            }

        } catch (error) {
            errors.push('Settings validation failed');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate template preview description
     */
    generateTemplatePreview(settings) {
        try {
            const parts = [];
            
            if (settings.type === 'text' || settings.type === 'combined') {
                const text = settings.text.content || 'Text watermark';
                parts.push(`Text: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`);
            }
            
            if (settings.type === 'image' || settings.type === 'combined') {
                parts.push('Image watermark');
            }
            
            parts.push(`Position: ${settings.position.preset}`);
            parts.push(`Format: ${settings.output.format.toUpperCase()}`);
            
            return parts.join(' • ');

        } catch (error) {
            return 'Watermark template';
        }
    }

    /**
     * Get template description
     */
    getTemplateDescription(template) {
        try {
            const settings = template.settings;
            const parts = [];
            
            if (settings.type === 'text' || settings.type === 'combined') {
                parts.push(`Text: ${settings.text.content || 'Custom text'}`);
                parts.push(`Font: ${settings.text.font}`);
                parts.push(`Size: ${settings.text.size}px`);
            }
            
            if (settings.type === 'image' || settings.type === 'combined') {
                parts.push('Image watermark');
                parts.push(`Scale: ${settings.image.scale}%`);
            }
            
            return parts.join(' ');

        } catch (error) {
            return '';
        }
    }

    /**
     * Determine template category
     */
    determineTemplateCategory(settings) {
        try {
            if (settings.type === 'text') {
                return 'Text Watermarks';
            } else if (settings.type === 'image') {
                return 'Image Watermarks';
            } else if (settings.type === 'combined') {
                return 'Combined Watermarks';
            } else {
                return 'Other';
            }
        } catch (error) {
            return 'Other';
        }
    }

    /**
     * Load templates from storage
     */
    loadTemplates() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const templates = JSON.parse(stored);
                return Array.isArray(templates) ? templates : [];
            }
        } catch (error) {
            console.warn('Failed to load templates from storage:', error);
        }
        return [];
    }

    /**
     * Save templates to storage
     */
    async saveTemplates() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.templates));
        } catch (error) {
            console.error('Failed to save templates to storage:', error);
            throw new Error('Failed to save templates');
        }
    }

    /**
     * Generate unique template ID
     */
    generateTemplateId() {
        return `tpl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Clone settings object deeply
     */
    cloneSettings(settings) {
        try {
            return JSON.parse(JSON.stringify(settings));
        } catch (error) {
            console.error('Error cloning settings:', error);
            return { ...settings };
        }
    }

    /**
     * Clear all templates
     */
    async clearAllTemplates() {
        try {
            this.templates = [];
            await this.saveTemplates();
        } catch (error) {
            console.error('Error clearing templates:', error);
            throw new Error('Failed to clear templates');
        }
    }

    /**
     * Get storage usage
     */
    getStorageUsage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            const usage = stored ? stored.length : 0;
            const maxSize = 5 * 1024 * 1024; // Approximate localStorage limit
            
            return {
                used: usage,
                available: maxSize - usage,
                percentage: Math.round((usage / maxSize) * 100),
                templateCount: this.templates.length
            };
        } catch (error) {
            return {
                used: 0,
                available: 0,
                percentage: 0,
                templateCount: 0
            };
        }
    }
}
