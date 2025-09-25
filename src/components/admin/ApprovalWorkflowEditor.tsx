'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalStepType,
  ApprovalCondition,
  ApprovalAction,
  WorkflowCreateRequest,
  WorkflowUpdateRequest,
  ValidationResult,
} from '../../types';

interface ApprovalWorkflowEditorProps {
  workflow?: ApprovalWorkflow | null;
  onSave: (
    workflow: WorkflowCreateRequest | WorkflowUpdateRequest
  ) => Promise<ValidationResult>;
  onCancel: () => void;
  availableUsers?: Array<{ id: string; name: string; role: string }>;
  availableRoles?: string[];
  isLoading?: boolean;
  isEditing?: boolean;
}

interface WorkflowForm {
  name: string;
  description: string;
  fandom_id: string;
  steps: ApprovalStep[];
  is_active: boolean;
}

interface StepForm extends Omit<ApprovalStep, 'id' | 'workflow_id'> {
  tempId: string;
}

export function ApprovalWorkflowEditor({
  workflow,
  onSave,
  onCancel,
  availableUsers = [],
  availableRoles = ['admin', 'moderator', 'reviewer'],
  isLoading = false,
  isEditing = false,
}: ApprovalWorkflowEditorProps) {
  const [formData, setFormData] = useState<WorkflowForm>({
    name: '',
    description: '',
    fandom_id: '',
    steps: [],
    is_active: true,
  });

  const [draggedStep, setDraggedStep] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationResults, setValidationResults] =
    useState<ValidationResult | null>(null);

  // Initialize form data from workflow prop
  useEffect(() => {
    if (workflow) {
      setFormData({
        name: workflow.name,
        description: workflow.description || '',
        fandom_id: workflow.fandom_id,
        steps: workflow.steps || [],
        is_active: workflow.is_active !== false,
      });
    }
  }, [workflow]);

  // Generate temporary ID for new steps
  const generateTempId = useCallback(() => {
    return `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Add new approval step
  const addStep = useCallback(
    (type: ApprovalStepType) => {
      const newStep: StepForm = {
        tempId: generateTempId(),
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} Step`,
        description: '',
        step_type: type,
        step_order: formData.steps.length,
        required_approvers: type === 'automatic' ? 0 : 1,
        assigned_users: [],
        assigned_roles: [],
        conditions: [],
        actions: [],
        timeout_hours: type === 'automatic' ? 0 : 24,
        is_parallel: false,
        can_skip: false,
      };

      setFormData(prev => ({
        ...prev,
        steps: [...prev.steps, newStep as ApprovalStep],
      }));
    },
    [formData.steps.length, generateTempId]
  );

  // Update step
  const updateStep = useCallback(
    (stepIndex: number, updates: Partial<ApprovalStep>) => {
      setFormData(prev => ({
        ...prev,
        steps: prev.steps.map((step, index) =>
          index === stepIndex ? { ...step, ...updates } : step
        ),
      }));
    },
    []
  );

  // Remove step
  const removeStep = useCallback((stepIndex: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps
        .filter((_, index) => index !== stepIndex)
        .map((step, index) => ({
          ...step,
          step_order: index,
        })),
    }));
  }, []);

  // Reorder steps
  const reorderSteps = useCallback((fromIndex: number, toIndex: number) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const [movedStep] = newSteps.splice(fromIndex, 1);
      newSteps.splice(toIndex, 0, movedStep);

      return {
        ...prev,
        steps: newSteps.map((step, index) => ({
          ...step,
          step_order: index,
        })),
      };
    });
  }, []);

  // Add condition to step
  const addCondition = useCallback(
    (stepIndex: number) => {
      const newCondition: ApprovalCondition = {
        id: generateTempId(),
        condition_type: 'user_role',
        condition_value: '',
        operator: 'equals',
      };

      updateStep(stepIndex, {
        conditions: [
          ...(formData.steps[stepIndex].conditions || []),
          newCondition,
        ],
      });
    },
    [formData.steps, updateStep, generateTempId]
  );

  // Update condition
  const updateCondition = useCallback(
    (
      stepIndex: number,
      conditionIndex: number,
      updates: Partial<ApprovalCondition>
    ) => {
      const step = formData.steps[stepIndex];
      const newConditions = [...(step.conditions || [])];
      newConditions[conditionIndex] = {
        ...newConditions[conditionIndex],
        ...updates,
      };

      updateStep(stepIndex, { conditions: newConditions });
    },
    [formData.steps, updateStep]
  );

  // Remove condition
  const removeCondition = useCallback(
    (stepIndex: number, conditionIndex: number) => {
      const step = formData.steps[stepIndex];
      const newConditions = (step.conditions || []).filter(
        (_, index) => index !== conditionIndex
      );

      updateStep(stepIndex, { conditions: newConditions });
    },
    [formData.steps, updateStep]
  );

  // Validate form
  const validateForm = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Workflow name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.fandom_id) {
      newErrors.fandom_id = 'Fandom selection is required';
    }

    if (formData.steps.length === 0) {
      newErrors.steps = 'At least one approval step is required';
    }

    // Validate each step
    formData.steps.forEach((step, index) => {
      if (!step.name.trim()) {
        newErrors[`step_${index}_name`] = `Step ${index + 1} name is required`;
      }

      if (step.step_type !== 'automatic' && step.required_approvers < 1) {
        newErrors[`step_${index}_approvers`] = `Step ${
          index + 1
        } must require at least 1 approver`;
      }

      if (
        step.assigned_users.length === 0 &&
        step.assigned_roles.length === 0
      ) {
        newErrors[`step_${index}_assignment`] = `Step ${
          index + 1
        } must have assigned users or roles`;
      }
    });

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

      setErrors({});

      try {
        const workflowData =
          isEditing && workflow
            ? ({
                workflow_id: workflow.id,
                updates: formData,
              } as WorkflowUpdateRequest)
            : (formData as WorkflowCreateRequest);

        const result = await onSave(workflowData);
        setValidationResults(result);

        if (result.is_valid) {
          console.log('Workflow saved successfully');
          // Parent component should handle navigation
        }
      } catch (error) {
        setErrors({
          general:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred',
        });
      }
    },
    [formData, validateForm, isEditing, workflow, onSave]
  );

  // Drag and drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent, stepIndex: number) => {
      setDraggedStep(stepIndex.toString());
      e.dataTransfer.effectAllowed = 'move';
    },
    []
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();

      if (draggedStep !== null) {
        const dragIndex = parseInt(draggedStep);
        if (dragIndex !== dropIndex) {
          reorderSteps(dragIndex, dropIndex);
        }
      }

      setDraggedStep(null);
    },
    [draggedStep, reorderSteps]
  );

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isEditing ? 'Edit Approval Workflow' : 'Create Approval Workflow'}
        </h2>
        <p className="text-gray-600">
          Configure the approval process for content changes in this fandom.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Workflow Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={e =>
                setFormData(prev => ({ ...prev, name: e.target.value }))
              }
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="e.g., Standard Content Approval"
              disabled={isLoading}
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    is_active: e.target.checked,
                  }))
                }
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                disabled={isLoading}
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Active Workflow
              </span>
            </label>
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
            rows={3}
            value={formData.description}
            onChange={e =>
              setFormData(prev => ({ ...prev, description: e.target.value }))
            }
            className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe when and how this workflow should be used..."
            disabled={isLoading}
            required
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Approval Steps */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Approval Steps
            </h3>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => addStep('manual')}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={isLoading}
              >
                Add Manual Step
              </button>
              <button
                type="button"
                onClick={() => addStep('automatic')}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                disabled={isLoading}
              >
                Add Automatic Step
              </button>
            </div>
          </div>

          {errors.steps && (
            <p className="mb-4 text-sm text-red-600">{errors.steps}</p>
          )}

          <div className="space-y-4">
            {formData.steps.map((step, stepIndex) => (
              <div
                key={step.id || `temp-${stepIndex}`}
                className="border border-gray-200 rounded-lg p-4"
                draggable
                onDragStart={e => handleDragStart(e, stepIndex)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, stepIndex)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full text-sm font-medium">
                      {stepIndex + 1}
                    </div>
                    <div>
                      <input
                        type="text"
                        value={step.name}
                        onChange={e =>
                          updateStep(stepIndex, { name: e.target.value })
                        }
                        className="text-lg font-medium bg-transparent border-none focus:outline-none focus:ring-0 p-0"
                        placeholder="Step name"
                        disabled={isLoading}
                      />
                      <div className="flex items-center space-x-2 mt-1">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            step.step_type === 'automatic'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {step.step_type}
                        </span>
                        {step.is_parallel && (
                          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                            Parallel
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStep(stepIndex)}
                    className="text-red-600 hover:text-red-800"
                    disabled={isLoading}
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Required Approvers
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={step.required_approvers}
                      onChange={e =>
                        updateStep(stepIndex, {
                          required_approvers: parseInt(e.target.value) || 0,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isLoading || step.step_type === 'automatic'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout (hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={step.timeout_hours || 24}
                      onChange={e =>
                        updateStep(stepIndex, {
                          timeout_hours: parseInt(e.target.value) || 24,
                        })
                      }
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={step.is_parallel || false}
                        onChange={e =>
                          updateStep(stepIndex, {
                            is_parallel: e.target.checked,
                          })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Parallel Execution
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={step.can_skip || false}
                        onChange={e =>
                          updateStep(stepIndex, { can_skip: e.target.checked })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        disabled={isLoading}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Can Skip
                      </span>
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={step.description || ''}
                    onChange={e =>
                      updateStep(stepIndex, { description: e.target.value })
                    }
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Describe what happens in this step..."
                    disabled={isLoading}
                  />
                </div>

                {/* Assigned Users and Roles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Roles
                    </label>
                    <select
                      multiple
                      value={step.assigned_roles || []}
                      onChange={e => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          option => option.value
                        );
                        updateStep(stepIndex, { assigned_roles: selected });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      size={3}
                      disabled={isLoading}
                    >
                      {availableRoles.map(role => (
                        <option key={role} value={role}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned Users
                    </label>
                    <select
                      multiple
                      value={step.assigned_users || []}
                      onChange={e => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                          option => option.value
                        );
                        updateStep(stepIndex, { assigned_users: selected });
                      }}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      size={3}
                      disabled={isLoading}
                    >
                      {availableUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditions */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Conditions
                    </label>
                    <button
                      type="button"
                      onClick={() => addCondition(stepIndex)}
                      className="text-sm text-indigo-600 hover:text-indigo-800"
                      disabled={isLoading}
                    >
                      Add Condition
                    </button>
                  </div>

                  {(step.conditions || []).map((condition, conditionIndex) => (
                    <div
                      key={condition.id}
                      className="flex items-center space-x-2 mb-2"
                    >
                      <select
                        value={condition.condition_type}
                        onChange={e =>
                          updateCondition(stepIndex, conditionIndex, {
                            condition_type: e.target.value as any,
                          })
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isLoading}
                      >
                        <option value="user_role">User Role</option>
                        <option value="content_type">Content Type</option>
                        <option value="change_magnitude">
                          Change Magnitude
                        </option>
                      </select>

                      <select
                        value={condition.operator}
                        onChange={e =>
                          updateCondition(stepIndex, conditionIndex, {
                            operator: e.target.value as any,
                          })
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={isLoading}
                      >
                        <option value="equals">Equals</option>
                        <option value="not_equals">Not Equals</option>
                        <option value="contains">Contains</option>
                        <option value="greater_than">Greater Than</option>
                        <option value="less_than">Less Than</option>
                      </select>

                      <input
                        type="text"
                        value={condition.condition_value}
                        onChange={e =>
                          updateCondition(stepIndex, conditionIndex, {
                            condition_value: e.target.value,
                          })
                        }
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="Value"
                        disabled={isLoading}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeCondition(stepIndex, conditionIndex)
                        }
                        className="text-red-600 hover:text-red-800 text-sm"
                        disabled={isLoading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                {/* Display errors for this step */}
                {Object.keys(errors).some(key =>
                  key.startsWith(`step_${stepIndex}_`)
                ) && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <ul className="text-sm text-red-600 space-y-1">
                      {Object.entries(errors)
                        .filter(([key]) => key.startsWith(`step_${stepIndex}_`))
                        .map(([key, error]) => (
                          <li key={key}>{error}</li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
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
                  </li>
                ))}
                {validationResults.conflicts?.map((conflict, index) => (
                  <li key={index}>Conflict: {conflict.description}</li>
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
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isEditing ? 'Update Workflow' : 'Create Workflow'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ApprovalWorkflowEditor;
