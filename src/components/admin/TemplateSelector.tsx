'use client';

import React from 'react';
import type { FandomTemplate } from '@/lib/database/schemas';
import { TemplateCategory } from '../../types/validation-rules';

interface TemplateSelectorProps {
  templates: FandomTemplate[];
  selectedTemplate?: FandomTemplate | null;
  onTemplateSelect: (template: FandomTemplate | null) => void;
  onCreateFromTemplate?: (template: FandomTemplate) => void;
  onPreviewTemplate?: (template: FandomTemplate) => void;
  categories?: TemplateCategory[];
  isLoading?: boolean;
  allowMultiple?: boolean;
  showPreview?: boolean;
  showActions?: boolean;
}

// Simplified placeholder component for build compatibility
// TODO: Restore full functionality after updating type interfaces
export default function TemplateSelector({
  templates,
  selectedTemplate,
  onTemplateSelect,
  onCreateFromTemplate,
  onPreviewTemplate,
  categories,
  isLoading = false,
  allowMultiple = false,
  showPreview = false,
  showActions = true,
}: TemplateSelectorProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading templates...</span>
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center p-8 text-gray-500">
        <p>No templates available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Template Selector</h3>
      <p className="text-sm text-orange-600 bg-orange-50 p-3 rounded-md">
        ⚠️ Template selector is temporarily simplified during type system
        updates. Full functionality will be restored after interface updates are
        complete.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.slice(0, 6).map(template => (
          <div
            key={template.id}
            className={`border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors ${
              selectedTemplate?.id === template.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
            onClick={() => onTemplateSelect(template)}
          >
            <h4 className="font-medium text-gray-900">{template.name}</h4>
            {template.description && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {template.description}
              </p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {template.genre}
              </span>
              <span className="text-xs text-gray-400">v{template.version}</span>
            </div>

            {showActions && (
              <div className="mt-3 flex gap-2">
                {onCreateFromTemplate && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onCreateFromTemplate(template);
                    }}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Use Template
                  </button>
                )}
                {onPreviewTemplate && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onPreviewTemplate(template);
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                  >
                    Preview
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length > 6 && (
        <p className="text-sm text-gray-500 text-center">
          Showing first 6 of {templates.length} templates
        </p>
      )}
    </div>
  );
}