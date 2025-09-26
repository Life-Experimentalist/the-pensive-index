'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ContentVersion,
  ContentVersionHistory,
  ContentChange,
  ContentDiff,
  Fandom,
  Tag,
  PlotBlock,
  TagClass,
} from '../../types';

interface ContentVersionViewerProps {
  fandom: Fandom;
  contentType: 'fandom' | 'tag' | 'plot_block' | 'tag_class';
  contentId: string;
  versions: ContentVersion[];
  onRestore?: (versionId: string) => Promise<void>;
  onCompare?: (versionA: string, versionB: string) => Promise<ContentDiff>;
  isLoading?: boolean;
}

interface VersionComparison {
  versionA: ContentVersion;
  versionB: ContentVersion;
  diff?: ContentDiff;
}

type ViewMode = 'list' | 'timeline' | 'compare' | 'details';

export function ContentVersionViewer({
  fandom,
  contentType,
  contentId,
  versions,
  onRestore,
  onCompare,
  isLoading = false,
}: ContentVersionViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedVersion, setSelectedVersion] = useState<ContentVersion | null>(
    null
  );
  const [comparison, setComparison] = useState<VersionComparison | null>(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<string | null>(
    null
  );

  // Sort versions by creation date (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [versions]);

  // Get current version
  const currentVersion = useMemo(() => {
    return sortedVersions.find(v => v.is_current) || sortedVersions[0];
  }, [sortedVersions]);

  // Format version data for display
  const formatVersionData = useCallback((version: ContentVersion) => {
    try {
      const data =
        typeof version.content_data === 'string'
          ? JSON.parse(version.content_data)
          : version.content_data;
      return JSON.stringify(data, null, 2);
    } catch {
      return version.content_data?.toString() || 'No data';
    }
  }, []);

  // Get change summary for version
  const getChangeSummary = useCallback((version: ContentVersion) => {
    const changes = version.changes || [];
    const summary: Record<string, number> = {};

    changes.forEach(change => {
      summary[change.change_type] = (summary[change.change_type] || 0) + 1;
    });

    return Object.entries(summary)
      .map(([type, count]) => `${count} ${type}${count !== 1 ? 's' : ''}`)
      .join(', ');
  }, []);

  // Handle version comparison
  const handleCompare = useCallback(
    async (versionA: ContentVersion, versionB: ContentVersion) => {
      if (!onCompare) {
        return;
      }

      try {
        const diff = await onCompare(versionA.id, versionB.id);
        setComparison({ versionA, versionB, diff });
        setViewMode('compare');
      } catch (error) {
        console.error('Failed to compare versions:', error);
      }
    },
    [onCompare]
  );

  // Handle version restore
  const handleRestore = useCallback(
    async (versionId: string) => {
      if (!onRestore) {
        return;
      }

      try {
        await onRestore(versionId);
        setShowRestoreConfirm(null);
      } catch (error) {
        console.error('Failed to restore version:', error);
      }
    },
    [onRestore]
  );

  // Render version list view
  const renderListView = () => (
    <div className="space-y-4">
      {sortedVersions.map(version => (
        <div
          key={version.id}
          className={`border rounded-lg p-4 transition-all ${
            version.is_current
              ? 'border-green-500 bg-green-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <span className="text-lg font-medium text-gray-900">
                  Version {version.version_number}
                </span>
                {version.is_current && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Current
                  </span>
                )}
                <span className="text-sm text-gray-500">
                  {new Date(version.created_at).toLocaleString()}
                </span>
              </div>

              {version.change_description && (
                <p className="text-sm text-gray-700 mb-2">
                  {version.change_description}
                </p>
              )}

              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>By {version.created_by || 'System'}</span>
                {version.changes && version.changes.length > 0 && (
                  <span>{getChangeSummary(version)}</span>
                )}
                <span>
                  {Object.keys(version.content_data || {}).length} fields
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => {
                  setSelectedVersion(version);
                  setViewMode('details');
                }}
                className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
              >
                View
              </button>

              {!version.is_current && onRestore && (
                <button
                  onClick={() => setShowRestoreConfirm(version.id)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  Restore
                </button>
              )}

              {onCompare &&
                currentVersion &&
                version.id !== currentVersion.id && (
                  <button
                    onClick={() => handleCompare(currentVersion, version)}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Compare
                  </button>
                )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Render timeline view
  const renderTimelineView = () => (
    <div className="relative">
      <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

      <div className="space-y-8">
        {sortedVersions.map((version, index) => (
          <div key={version.id} className="relative flex items-start">
            <div
              className={`flex-shrink-0 w-4 h-4 rounded-full border-2 ${
                version.is_current
                  ? 'bg-green-500 border-green-500'
                  : 'bg-white border-gray-300'
              }`}
            ></div>

            <div className="ml-6 flex-1">
              <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-medium text-gray-900">
                      Version {version.version_number}
                    </span>
                    {version.is_current && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(version.created_at).toLocaleString()}
                  </span>
                </div>

                {version.change_description && (
                  <p className="text-sm text-gray-700 mb-3">
                    {version.change_description}
                  </p>
                )}

                {version.changes && version.changes.length > 0 && (
                  <div className="space-y-1">
                    {version.changes.slice(0, 3).map((change, changeIndex) => (
                      <div
                        key={changeIndex}
                        className="flex items-center space-x-2 text-sm"
                      >
                                                <span
                          className={`px-2 py-1 text-xs rounded ${
                            change.change_type === 'added'
                              ? 'bg-green-100 text-green-800'
                              : change.change_type === 'modified'
                              ? 'bg-blue-100 text-blue-800'
                              : change.change_type === 'removed'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {change.change_type}
                        </span>
                        <span className="text-gray-700">
                          {change.field}
                        </span>
                        {change.old_value && (
                          <span className="text-gray-500">
                            {typeof change.old_value === 'string' &&
                            change.old_value.length > 20
                              ? change.old_value.substring(0, 20) + '...'
                              : change.old_value?.toString()}
                          </span>
                        )}
                      </div>
                    ))}
                    {version.changes.length > 3 && (
                      <div className="text-xs text-gray-500">
                        ... and {version.changes.length - 3} more changes
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-500">
                    By {version.created_by || 'System'}
                  </span>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedVersion(version);
                        setViewMode('details');
                      }}
                      className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800"
                    >
                      View Details
                    </button>

                    {!version.is_current && onRestore && (
                      <button
                        onClick={() => setShowRestoreConfirm(version.id)}
                        className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render comparison view
  const renderComparisonView = () => {
    if (!comparison) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Version Comparison
          </h3>
          <button
            onClick={() => {
              setComparison(null);
              setViewMode('list');
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Back to List
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Version A */}
          <div className="border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  Version {comparison.versionA.version_number}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(comparison.versionA.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-4">
              <pre className="text-sm text-gray-700 bg-gray-50 rounded p-3 overflow-auto max-h-96">
                {formatVersionData(comparison.versionA)}
              </pre>
            </div>
          </div>

          {/* Version B */}
          <div className="border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-900">
                  Version {comparison.versionB.version_number}
                </span>
                <span className="text-sm text-gray-500">
                  {new Date(comparison.versionB.created_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="p-4">
              <pre className="text-sm text-gray-700 bg-gray-50 rounded p-3 overflow-auto max-h-96">
                {formatVersionData(comparison.versionB)}
              </pre>
            </div>
          </div>
        </div>

        {/* Diff Summary */}
        {comparison.diff && (
          <div className="border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Changes Summary</h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {comparison.diff.changes?.map((change, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">
                        {change.field}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          change.change_type === 'added'
                            ? 'bg-green-100 text-green-800'
                            : change.change_type === 'removed'
                            ? 'bg-red-100 text-red-800'
                            : change.change_type === 'modified'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {change.change_type}
                      </span>
                    </div>

                    {change.old_value !== undefined && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-red-700">
                          Old:
                        </span>
                        <pre className="text-sm text-red-700 bg-red-50 rounded p-2 mt-1 overflow-auto">
                          {typeof change.old_value === 'string'
                            ? change.old_value
                            : JSON.stringify(change.old_value, null, 2)}
                        </pre>
                      </div>
                    )}

                    {change.new_value !== undefined && (
                      <div>
                        <span className="text-sm font-medium text-green-700">
                          New:
                        </span>
                        <pre className="text-sm text-green-700 bg-green-50 rounded p-2 mt-1 overflow-auto">
                          {typeof change.new_value === 'string'
                            ? change.new_value
                            : JSON.stringify(change.new_value, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}

                {(!comparison.diff.changes ||
                  comparison.diff.changes.length === 0) && (
                  <div className="text-center text-gray-500 py-8">
                    No differences found between these versions
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render details view
  const renderDetailsView = () => {
    if (!selectedVersion) {
      return null;
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Version {selectedVersion.version_number} Details
          </h3>
          <button
            onClick={() => {
              setSelectedVersion(null);
              setViewMode('list');
            }}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Back to List
          </button>
        </div>

        {/* Version Metadata */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">
            Version Information
          </h4>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="font-medium text-gray-700">Version Number</dt>
              <dd className="text-gray-900">
                {selectedVersion.version_number}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Created At</dt>
              <dd className="text-gray-900">
                {new Date(selectedVersion.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Created By</dt>
              <dd className="text-gray-900">
                {selectedVersion.created_by || 'System'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-gray-700">Status</dt>
              <dd className="text-gray-900">
                {selectedVersion.is_current ? (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    Current Version
                  </span>
                ) : (
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                    Historical Version
                  </span>
                )}
              </dd>
            </div>
            {selectedVersion.change_description && (
              <div className="md:col-span-2">
                <dt className="font-medium text-gray-700">
                  Change Description
                </dt>
                <dd className="text-gray-900">
                  {selectedVersion.change_description}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Content Data */}
        <div className="border border-gray-200 rounded-lg">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h4 className="font-medium text-gray-900">Content Data</h4>
          </div>
          <div className="p-4">
            <pre className="text-sm text-gray-700 bg-gray-50 rounded p-4 overflow-auto max-h-96">
              {formatVersionData(selectedVersion)}
            </pre>
          </div>
        </div>

        {/* Changes */}
        {selectedVersion.changes && selectedVersion.changes.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">
                Changes in This Version
              </h4>
            </div>
            <div className="p-4">
              <div className="space-y-3">
                {selectedVersion.changes.map((change, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                                            <span className="font-medium text-gray-900">
                        {change.field}
                      </span>
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          change.change_type === 'added'
                            ? 'bg-green-100 text-green-800'
                            : change.change_type === 'modified'
                            ? 'bg-blue-100 text-blue-800'
                            : change.change_type === 'removed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {change.change_type}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {change.old_value !== undefined && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Previous:
                          </span>
                          <span className="ml-2 text-gray-600">
                            {typeof change.old_value === 'string' &&
                            change.old_value.length > 100
                              ? change.old_value.substring(0, 100) + '...'
                              : change.old_value?.toString() || 'null'}
                          </span>
                        </div>
                      )}

                      {change.new_value !== undefined && (
                        <div>
                          <span className="font-medium text-gray-700">
                            Current:
                          </span>
                          <span className="ml-2 text-gray-600">
                            {typeof change.new_value === 'string' &&
                            change.new_value.length > 100
                              ? change.new_value.substring(0, 100) + '...'
                              : change.new_value?.toString() || 'null'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {!selectedVersion.is_current && onRestore && (
            <button
              onClick={() => setShowRestoreConfirm(selectedVersion.id)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Restore This Version
            </button>
          )}

          {onCompare &&
            currentVersion &&
            selectedVersion.id !== currentVersion.id && (
              <button
                onClick={() => handleCompare(currentVersion, selectedVersion)}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Compare with Current
              </button>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Version History - {fandom.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {contentType.replace('_', ' ')} • {versions.length} versions
            </p>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            {[
              { mode: 'list' as ViewMode, label: 'List', icon: '📋' },
              { mode: 'timeline' as ViewMode, label: 'Timeline', icon: '📅' },
            ].map(option => (
              <button
                key={option.mode}
                onClick={() => setViewMode(option.mode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === option.mode
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span className="mr-1">{option.icon}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-500">Loading version history...</div>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center text-gray-500 py-12">
            No version history available
          </div>
        ) : (
          <>
            {viewMode === 'list' && renderListView()}
            {viewMode === 'timeline' && renderTimelineView()}
            {viewMode === 'compare' && renderComparisonView()}
            {viewMode === 'details' && renderDetailsView()}
          </>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Confirm Version Restore
            </h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to restore this version? This will create a
              new version with the restored content. The current version will be
              preserved in the history.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowRestoreConfirm(null)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(showRestoreConfirm)}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                Restore Version
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentVersionViewer;
