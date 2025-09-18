/**
 * Testing Sandbox Page
 *
 * Interactive testing interface for validation rules:
 * - Test individual rules or full pathways
 * - Mock pathway data input
 * - Real-time validation results
 * - Performance metrics
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BeakerIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';

interface TestPathway {
  tags: string[];
  plotBlocks: string[];
  selections: Record<string, any>;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  appliedRules: string[];
  executionTime: string;
  testedRules: number;
}

interface ValidationMessage {
  ruleId: string;
  ruleName: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  data?: Record<string, any>;
}

const mockRules = [
  { id: '1', name: 'Harry/Hermione Shipping Conflict', fandom: 'Harry Potter' },
  { id: '2', name: 'Time Travel Consistency Check', fandom: 'Harry Potter' },
  { id: '3', name: 'Character Death Warnings', fandom: 'Harry Potter' },
];

export default function TestingSandbox() {
  const { data: session } = useSession();
  const [selectedFandom, setSelectedFandom] = useState('hp');
  const [selectedRules, setSelectedRules] = useState<string[]>([]);
  const [testPathway, setTestPathway] = useState<TestPathway>({
    tags: [],
    plotBlocks: [],
    selections: {},
  });
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleTestRule = async (ruleId?: string) => {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const mockResult: ValidationResult = {
        isValid: Math.random() > 0.3,
        errors: [
          {
            ruleId: '1',
            ruleName: 'Harry/Hermione Shipping Conflict',
            message:
              'Conflicting romance tags detected: harry/hermione and harry/ginny cannot both be present',
            severity: 'error',
            data: { conflictingTags: ['harry/hermione', 'harry/ginny'] },
          },
        ],
        warnings: [
          {
            ruleId: '2',
            ruleName: 'Time Travel Consistency Check',
            message:
              'Time travel plot block detected but no temporal consistency tags found',
            severity: 'warning',
            data: {
              suggestedTags: ['time-travel-fixed', 'time-travel-butterfly'],
            },
          },
        ],
        info: [
          {
            ruleId: '3',
            ruleName: 'Character Death Warnings',
            message: 'No character death warnings needed for current selection',
            severity: 'info',
          },
        ],
        appliedRules: ruleId ? [ruleId] : selectedRules,
        executionTime: `${Math.random() * 200 + 50}ms`,
        testedRules: ruleId ? 1 : selectedRules.length,
      };

      setValidationResult(mockResult);
      setIsLoading(false);
    }, 1000);
  };

  const addTag = (tag: string) => {
    if (tag && !testPathway.tags.includes(tag)) {
      setTestPathway(prev => ({
        ...prev,
        tags: [...prev.tags, tag],
      }));
    }
  };

  const removeTag = (tag: string) => {
    setTestPathway(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const addPlotBlock = (block: string) => {
    if (block && !testPathway.plotBlocks.includes(block)) {
      setTestPathway(prev => ({
        ...prev,
        plotBlocks: [...prev.plotBlocks, block],
      }));
    }
  };

  const removePlotBlock = (block: string) => {
    setTestPathway(prev => ({
      ...prev,
      plotBlocks: prev.plotBlocks.filter(b => b !== block),
    }));
  };

  const getMessageIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return ExclamationTriangleIcon;
      case 'warning':
        return ExclamationTriangleIcon;
      case 'info':
        return InformationCircleIcon;
      default:
        return CheckCircleIcon;
    }
  };

  const getMessageColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <BeakerIcon className="w-8 h-8 mr-3 text-indigo-600" />
            Testing Sandbox
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            Test your validation rules with mock pathway data to ensure they
            work as expected.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Test Configuration */}
          <div className="space-y-6">
            {/* Fandom Selection */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Test Configuration
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fandom
                  </label>
                  <select
                    value={selectedFandom}
                    onChange={e => setSelectedFandom(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="hp">Harry Potter</option>
                    <option value="pj">Percy Jackson</option>
                    <option value="naruto">Naruto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rules to Test
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {mockRules.map(rule => (
                      <label key={rule.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedRules.includes(rule.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedRules(prev => [...prev, rule.id]);
                            } else {
                              setSelectedRules(prev =>
                                prev.filter(id => id !== rule.id)
                              );
                            }
                          }}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {rule.name}
                        </span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRules.length === mockRules.length}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedRules(mockRules.map(r => r.id));
                          } else {
                            setSelectedRules([]);
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        All Rules
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Pathway Data */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Mock Pathway Data
              </h3>

              <div className="space-y-4">
                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {testPathway.tags.map(tag => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-indigo-600 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add tag..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          addTag((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const commonTags = [
                          'harry/hermione',
                          'angst',
                          'time-travel',
                          'harry/ginny',
                        ];
                        const tag =
                          commonTags[
                            Math.floor(Math.random() * commonTags.length)
                          ];
                        addTag(tag);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Random
                    </button>
                  </div>
                </div>

                {/* Plot Blocks */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plot Blocks
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {testPathway.plotBlocks.map(block => (
                      <span
                        key={block}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                      >
                        {block}
                        <button
                          onClick={() => removePlotBlock(block)}
                          className="ml-1 text-green-600 hover:text-green-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      placeholder="Add plot block..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                      onKeyPress={e => {
                        if (e.key === 'Enter') {
                          addPlotBlock((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const commonBlocks = [
                          'Goblin Inheritance',
                          'Time Turner',
                          'Wrong Boy Who Lived',
                        ];
                        const block =
                          commonBlocks[
                            Math.floor(Math.random() * commonBlocks.length)
                          ];
                        addPlotBlock(block);
                      }}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Random
                    </button>
                  </div>
                </div>
              </div>

              {/* Test Actions */}
              <div className="mt-6 flex space-x-3">
                <button
                  onClick={() => handleTestRule()}
                  disabled={isLoading || selectedRules.length === 0}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <ClockIcon className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <PlayIcon className="w-4 h-4 mr-2" />
                  )}
                  {isLoading ? 'Testing...' : 'Test Selected Rules'}
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Validation Results
            </h3>

            {!validationResult ? (
              <div className="text-center py-12">
                <BeakerIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h4 className="mt-2 text-sm font-medium text-gray-900">
                  No tests run yet
                </h4>
                <p className="mt-1 text-sm text-gray-500">
                  Configure your test data and run validation to see results
                  here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary */}
                <div
                  className={`p-4 rounded-lg border ${
                    validationResult.isValid
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center">
                    {validationResult.isValid ? (
                      <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
                    )}
                    <span
                      className={`font-medium ${
                        validationResult.isValid
                          ? 'text-green-800'
                          : 'text-red-800'
                      }`}
                    >
                      {validationResult.isValid
                        ? 'Validation Passed'
                        : 'Validation Failed'}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Tested {validationResult.testedRules} rule
                    {validationResult.testedRules === 1 ? '' : 's'}
                    in {validationResult.executionTime}
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-2">
                  {[
                    ...validationResult.errors,
                    ...validationResult.warnings,
                    ...validationResult.info,
                  ].map((message, index) => {
                    const Icon = getMessageIcon(message.severity);
                    const colorClass = getMessageColor(message.severity);

                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border ${colorClass}`}
                      >
                        <div className="flex items-start">
                          <Icon className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {message.ruleName}
                            </div>
                            <div className="text-sm mt-1">
                              {message.message}
                            </div>
                            {message.data && (
                              <div className="mt-2 text-xs font-mono bg-white bg-opacity-50 p-2 rounded">
                                {JSON.stringify(message.data, null, 2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Test Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    Quick Tests
                  </h4>
                  <div className="space-y-2">
                    {mockRules.map(rule => (
                      <button
                        key={rule.id}
                        onClick={() => handleTestRule(rule.id)}
                        disabled={isLoading}
                        className="w-full text-left px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                      >
                        Test "{rule.name}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
