/**
 * Create Validation Rule Page
 *
 * Form interface for creating new validation rules:
 * - Rule metadata configuration
 * - Visual rule builder integration
 * - Preview and validation
 * - Save and test functionality
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  DocumentTextIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import RuleBuilder from '@/components/admin/RuleBuilder';

interface RuleFormData {
  name: string;
  description: string;
  fandomId: string;
  category: string;
  priority: number;
  isActive: boolean;
  appliesTo: string[];
  tags: string[];
  metadata: Record<string, any>;
}

const categories = [
  'shipping',
  'plot-consistency',
  'content-warnings',
  'character-tags',
  'genre-validation',
  'custom',
];

const fandoms = [
  { id: 'hp', name: 'Harry Potter' },
  { id: 'pj', name: 'Percy Jackson' },
  { id: 'naruto', name: 'Naruto' },
];

export default function CreateValidationRule() {
  const { data: session } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    description: '',
    fandomId: '',
    category: '',
    priority: 1,
    isActive: true,
    appliesTo: [],
    tags: [],
    metadata: {},
  });
  const [ruleNodes, setRuleNodes] = useState<any[]>([]);
  const [ruleEdges, setRuleEdges] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const userRole = (session?.user as any)?.role as
    | 'ProjectAdmin'
    | 'FandomAdmin';

  const handleInputChange = (field: keyof RuleFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addAppliesTo = (value: string) => {
    if (value && !formData.appliesTo.includes(value)) {
      handleInputChange('appliesTo', [...formData.appliesTo, value]);
    }
  };

  const removeAppliesTo = (value: string) => {
    handleInputChange(
      'appliesTo',
      formData.appliesTo.filter(item => item !== value)
    );
  };

  const addTag = (value: string) => {
    if (value && !formData.tags.includes(value)) {
      handleInputChange('tags', [...formData.tags, value]);
    }
  };

  const removeTag = (value: string) => {
    handleInputChange(
      'tags',
      formData.tags.filter(tag => tag !== value)
    );
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Rule name is required';
    }

    if (!formData.fandomId) {
      newErrors.fandomId = 'Fandom selection is required';
    }

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }

    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.priority = 'Priority must be between 1 and 10';
    }

    // Validate rule structure
    const hasConditions = ruleNodes.some(node => node.type === 'condition');
    const hasActions = ruleNodes.some(node => node.type === 'action');

    if (!hasConditions) {
      newErrors.rule = 'Rule must have at least one condition';
    }

    if (!hasActions) {
      newErrors.rule = newErrors.rule
        ? newErrors.rule + ' and at least one action'
        : 'Rule must have at least one action';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (isDraft = false) => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    try {
      // Convert visual rule to API format
      const ruleData = {
        ...formData,
        version: '1.0.0',
        conditions: ruleNodes
          .filter(node => node.type === 'condition')
          .map(node => ({
            type: node.data.type,
            target: node.data.target,
            operator: node.data.operator,
            value: node.data.value,
            weight: node.data.weight || 1,
            groupId: node.data.groupId || null,
            isNegated: node.data.isNegated || false,
            metadata: node.data.metadata || {},
          })),
        actions: ruleNodes
          .filter(node => node.type === 'action')
          .map(node => ({
            type: node.data.type,
            severity: node.data.severity,
            message: node.data.message,
            data: node.data.data || {},
            conditionGroup: node.data.conditionGroup || null,
          })),
        isActive: isDraft ? false : formData.isActive,
      };

      // Simulate API call
      console.log('Saving rule:', ruleData);

      setTimeout(() => {
        setIsSaving(false);
        router.push('/admin/validation-rules');
      }, 1000);
    } catch (error) {
      console.error('Error saving rule:', error);
      setIsSaving(false);
    }
  };

  const renderPreview = () => {
    if (!showPreview) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Rule Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-gray-900">Rule Information</h4>
                <dl className="mt-2 text-sm">
                  <dt className="font-medium text-gray-500">Name:</dt>
                  <dd className="text-gray-900">
                    {formData.name || 'Untitled Rule'}
                  </dd>
                  <dt className="font-medium text-gray-500 mt-2">Category:</dt>
                  <dd className="text-gray-900">
                    {formData.category || 'No category'}
                  </dd>
                  <dt className="font-medium text-gray-500 mt-2">Priority:</dt>
                  <dd className="text-gray-900">{formData.priority}</dd>
                </dl>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Rule Structure</h4>
                <dl className="mt-2 text-sm">
                  <dt className="font-medium text-gray-500">Conditions:</dt>
                  <dd className="text-gray-900">
                    {ruleNodes.filter(n => n.type === 'condition').length}
                  </dd>
                  <dt className="font-medium text-gray-500 mt-2">Actions:</dt>
                  <dd className="text-gray-900">
                    {ruleNodes.filter(n => n.type === 'action').length}
                  </dd>
                  <dt className="font-medium text-gray-500 mt-2">
                    Logic Gates:
                  </dt>
                  <dd className="text-gray-900">
                    {ruleNodes.filter(n => n.type === 'logicGate').length}
                  </dd>
                </dl>
              </div>
            </div>

            {formData.description && (
              <div>
                <h4 className="font-medium text-gray-900">Description</h4>
                <p className="mt-1 text-sm text-gray-600">
                  {formData.description}
                </p>
              </div>
            )}

            <div className="h-64">
              <RuleBuilder
                initialNodes={ruleNodes}
                initialEdges={ruleEdges}
                readOnly={true}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <DocumentTextIcon className="w-8 h-8 mr-3 text-indigo-600" />
              Create Validation Rule
            </h1>
            <p className="mt-2 text-sm text-gray-700">
              Design a new validation rule for your fandom to ensure story
              pathway consistency.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save & Activate'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rule Configuration */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Rule Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter rule name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e =>
                      handleInputChange('description', e.target.value)
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Describe what this rule validates"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fandom *
                  </label>
                  <select
                    value={formData.fandomId}
                    onChange={e =>
                      handleInputChange('fandomId', e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      errors.fandomId ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select fandom...</option>
                    {fandoms.map(fandom => (
                      <option key={fandom.id} value={fandom.id}>
                        {fandom.name}
                      </option>
                    ))}
                  </select>
                  {errors.fandomId && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.fandomId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={e =>
                      handleInputChange('category', e.target.value)
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      errors.category ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select category...</option>
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category.charAt(0).toUpperCase() +
                          category.slice(1).replace('-', ' ')}
                      </option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.category}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority (1-10)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={e =>
                      handleInputChange('priority', parseInt(e.target.value))
                    }
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                      errors.priority ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors.priority && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.priority}
                    </p>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={e =>
                        handleInputChange('isActive', e.target.checked)
                      }
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Activate rule immediately
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Applies To */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Applies To
              </h3>

              <div className="space-y-4">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.appliesTo.map(item => (
                      <span
                        key={item}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {item}
                        <button
                          onClick={() => removeAppliesTo(item)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Add tag class, component, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        addAppliesTo((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Visual Rule Builder */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Visual Rule Builder
                </h2>
                {errors.rule && (
                  <p className="mt-1 text-sm text-red-600">{errors.rule}</p>
                )}
              </div>
              <div className="h-96">
                <RuleBuilder
                  onRuleChange={(nodes, edges) => {
                    setRuleNodes(nodes);
                    setRuleEdges(edges);
                    // Clear rule errors when structure changes
                    if (errors.rule) {
                      setErrors(prev => ({ ...prev, rule: '' }));
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {renderPreview()}
      </div>
    </AdminLayout>
  );
}
