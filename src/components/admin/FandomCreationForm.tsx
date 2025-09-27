'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  FandomCreationRequest,
  ValidationResult,
  PlotBlock,
  Tag,
  PlotBlockCondition,
} from '../../types';

interface FandomCreationFormProps {
  templates: any[];
  onSubmit: (fandom: FandomCreationRequest) => Promise<ValidationResult>;
  onCancel: () => void;
  initialData?: Partial<FandomCreationRequest>;
  isLoading?: boolean;
}

interface FormErrors {
  name?: string;
  description?: string;
  category?: string;
  general?: string;
}

export function FandomCreationForm({
  templates,
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: FandomCreationFormProps) {
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    category: '',
    tags: [],
    plot_blocks: [],
    tag_classes: [],
    ...initialData,
  });

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [validationResults, setValidationResults] =
    useState<ValidationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load template data when template is selected
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplate(templateId);
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setFormData((prev: any) => ({
          ...prev,
          name: template.base_fandom.name || prev.name,
          description: template.base_fandom.description || prev.description,
          category: template.base_fandom.category || prev.category,
          tags: template.base_fandom.tags || prev.tags,
          plot_blocks: template.base_fandom.plot_blocks || prev.plot_blocks,
          tag_classes: template.base_fandom.tag_classes || prev.tag_classes,
        }));
      }
    },
    [templates]
  );

  // Form validation
  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Fandom name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Fandom name must be at least 2 characters';
    } else if (formData.name.length > 100) {
      newErrors.name = 'Fandom name must be less than 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < 10) {
      newErrors.description = 'Description must be at least 10 characters';
    }

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    return newErrors;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const formErrors = validateForm();
      if (Object.keys(formErrors).length > 0) {
        setErrors(formErrors);
        return;
      }

      setIsSubmitting(true);
      setErrors({});

      try {
        const result = await onSubmit(formData);
        setValidationResults(result);

        if (result.is_valid) {
          // Form submission successful - parent component will handle navigation
          console.log('Fandom created successfully');
        } else {
          setErrors({
            general:
              'Validation failed. Please check the validation results below.',
          });
        }
      } catch (error) {
        setErrors({
          general:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, onSubmit, validateForm]
  );

  // Handle input changes
  const handleInputChange = useCallback(
    (field: string, value: any) => {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
      // Clear related errors when user starts typing
      if (errors[field as keyof FormErrors]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Handle array field changes (tags, plot_blocks, tag_classes)
  const handleArrayFieldChange = useCallback(
    (field: 'tags' | 'plot_blocks' | 'tag_classes', items: any[]) => {
      setFormData((prev: any) => ({ ...prev, [field]: items }));
    },
    []
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Fandom
        </h2>
        <p className="text-gray-600">
          Configure a new fandom with tags, plot blocks, and validation rules.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Template Selection */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start from Template (Optional)
            </label>
            <select
              value={selectedTemplate}
              onChange={e => handleTemplateSelect(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              disabled={isLoading || isSubmitting}
            >
              <option value="">Create from scratch</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Fandom Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Harry Potter"
              disabled={isLoading || isSubmitting}
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category *
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={e => handleInputChange('category', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.category ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading || isSubmitting}
              required
            >
              <option value="">Select a category</option>
              <option value="books">Books</option>
              <option value="movies">Movies</option>
              <option value="tv-shows">TV Shows</option>
              <option value="games">Games</option>
              <option value="anime-manga">Anime & Manga</option>
              <option value="comics">Comics</option>
              <option value="other">Other</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category}</p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description *
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={e => handleInputChange('description', e.target.value)}
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe the fandom, its key elements, and what makes it unique..."
            disabled={isLoading || isSubmitting}
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Content Configuration */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Content Configuration
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tags */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Tags ({formData.tags.length})
              </h4>
              <div className="border border-gray-300 rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                {formData.tags.length === 0 ? (
                  <p className="text-gray-500 text-sm">No tags added yet</p>
                ) : (
                  <div className="space-y-1">
                    {formData.tags.map((tag: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-gray-100 px-2 py-1 rounded"
                      >
                        <span className="text-sm">
                          {typeof tag === 'string' ? tag : (tag as Tag).name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newTags = [...formData.tags];
                            newTags.splice(index, 1);
                            handleArrayFieldChange('tags', newTags);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                          disabled={isLoading || isSubmitting}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Plot Blocks */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Plot Blocks ({formData.plot_blocks.length})
              </h4>
              <div className="border border-gray-300 rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                {formData.plot_blocks.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No plot blocks added yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {formData.plot_blocks.map((block: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-blue-100 px-2 py-1 rounded"
                      >
                        <span className="text-sm">
                          {typeof block === 'string'
                            ? block
                            : (block as PlotBlock).name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const newBlocks = [...formData.plot_blocks];
                            newBlocks.splice(index, 1);
                            handleArrayFieldChange('plot_blocks', newBlocks);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                          disabled={isLoading || isSubmitting}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tag Classes */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Tag Classes ({formData.tag_classes.length})
              </h4>
              <div className="border border-gray-300 rounded-md p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
                {formData.tag_classes.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No tag classes added yet
                  </p>
                ) : (
                  <div className="space-y-1">
                    {formData.tag_classes.map(
                      (tagClass: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-green-100 px-2 py-1 rounded"
                        >
                          <span className="text-sm">
                            {typeof tagClass === 'string'
                              ? tagClass
                              : tagClass.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newClasses = [...formData.tag_classes];
                              newClasses.splice(index, 1);
                              handleArrayFieldChange('tag_classes', newClasses);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                            disabled={isLoading || isSubmitting}
                          >
                            Remove
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Validation Results */}
        {validationResults && !validationResults.is_valid && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-red-700 mb-4">
              Validation Issues
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
                {validationResults.missing_requirements?.map((req, index) => (
                  <li key={index}>
                    Missing {req.type}: {req.name}
                    {(req as any).description &&
                      ` - ${(req as any).description}`}
                  </li>
                ))}
                {validationResults.conflicts?.map((conflict, index) => (
                  <li key={index}>
                    Conflict: {conflict.description} (Severity:{' '}
                    {(conflict as any).severity})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-700">{errors.general}</p>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Fandom'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default FandomCreationForm;
