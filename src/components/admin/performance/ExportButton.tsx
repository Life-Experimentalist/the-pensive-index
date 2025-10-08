'use client';

/**
 * Export Button Client Component
 * Feature: 003-optimize-the-platform
 *
 * Client-side button for exporting performance data to CSV
 */

import { useState } from 'react';

export function ExportButton() {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (isExporting) return;

    try {
      setIsExporting(true);

      // Fetch all data
      const end = Math.floor(Date.now() / 1000);
      const start = end - 2592000; // Last 30 days

      const [metricsRes, errorsRes, resourceRes] = await Promise.all([
        fetch(
          `/api/admin/performance/metrics?start=${start}&end=${end}&groupBy=day`
        ),
        fetch(`/api/admin/performance/errors?start=${start}&end=${end}`),
        fetch(`/api/admin/performance/resources?start=${start}&end=${end}`),
      ]);

      if (!metricsRes.ok || !errorsRes.ok || !resourceRes.ok) {
        throw new Error('Failed to fetch export data');
      }

      const [metrics, errors, resources] = await Promise.all([
        metricsRes.json(),
        errorsRes.json(),
        resourceRes.json(),
      ]);

      // Convert to CSV
      const csvData = generateCSV({ metrics, errors, resources });

      // Trigger download
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `performance-report-${
        new Date().toISOString().split('T')[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isExporting ? 'Exporting...' : 'Export to CSV'}
    </button>
  );
}

/**
 * Generate CSV from performance data
 */
function generateCSV(data: {
  metrics: any;
  errors: any;
  resources: any;
}): string {
  const lines: string[] = [];

  // Header
  lines.push('Performance Report - The Pensieve Index');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');

  // Metrics section
  lines.push('METRICS');
  lines.push(
    'Date,Requests,Avg Duration (ms),P95 Duration (ms),Error Rate (%),Cache Hit Rate (%)'
  );

  if (data.metrics?.metrics) {
    data.metrics.metrics.forEach((metric: any) => {
      lines.push(
        [
          metric.timestamp || metric.date,
          metric.request_count || 0,
          metric.avg_duration?.toFixed(2) || '0',
          metric.p95_duration?.toFixed(2) || '0',
          ((metric.error_rate || 0) * 100).toFixed(2),
          ((metric.cache_hit_rate || 0) * 100).toFixed(2),
        ].join(',')
      );
    });
  }

  lines.push('');

  // Errors section
  lines.push('ERRORS');
  lines.push('Timestamp,Endpoint,Status,Message,User Type');

  if (data.errors?.errors) {
    data.errors.errors.forEach((error: any) => {
      lines.push(
        [
          error.timestamp,
          error.endpoint,
          error.status_code,
          `"${error.error_message?.replace(/"/g, '""') || ''}"`,
          error.user_type || 'ANONYMOUS',
        ].join(',')
      );
    });
  }

  lines.push('');

  // Resources section
  lines.push('RESOURCES');
  lines.push('Timestamp,Resource,Usage (%),Limit');

  if (data.resources?.resources) {
    data.resources.resources.forEach((resource: any) => {
      lines.push(
        [
          resource.timestamp,
          resource.resource_type,
          ((resource.usage_percent || 0) * 100).toFixed(2),
          resource.limit || 'N/A',
        ].join(',')
      );
    });
  }

  return lines.join('\n');
}
