'use client';

/**
 * T039: Admin Moderation Interface
 *
 * Comprehensive admin dashboard for submission queue management,
 * moderation workflows, and GitHub integration monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MessageSquare,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
} from 'lucide-react';
import type {
  StorySubmission,
  SubmissionStatus,
  ModerationActionType,
} from '@/types/submission';

/**
 * Submission queue interface
 */
interface SubmissionQueueItem extends StorySubmission {
  queuePosition: number;
  assignedModerator?: {
    id: string;
    name: string;
    githubUsername?: string;
  };
  githubIssue?: {
    number: number;
    url: string;
    state: 'open' | 'closed';
    labels: string[];
  };
  moderationHistory: Array<{
    id: string;
    actionType: ModerationActionType;
    actionBy: string;
    timestamp: Date;
    details?: any;
  }>;
  estimatedReviewTime?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  flags: string[];
}

/**
 * Queue filters and sorting options
 */
interface QueueFilters {
  status: SubmissionStatus | 'all';
  priority: string;
  assignedTo: string;
  fandom: string;
  dateRange: {
    start?: Date;
    end?: Date;
  };
  searchTerm: string;
  sortBy:
    | 'submissionDate'
    | 'priority'
    | 'queuePosition'
    | 'wordCount'
    | 'qualityScore';
  sortOrder: 'asc' | 'desc';
}

/**
 * Queue statistics
 */
interface QueueStats {
  totalPending: number;
  totalUnderReview: number;
  totalApproved: number;
  totalRejected: number;
  averageReviewTime: number;
  oldestSubmissionDays: number;
  moderatorWorkload: Array<{
    moderatorId: string;
    moderatorName: string;
    assignedCount: number;
    completedToday: number;
  }>;
  dailyStats: Array<{
    date: Date;
    submitted: number;
    approved: number;
    rejected: number;
  }>;
}

/**
 * SubmissionQueueCard props interface
 */
interface SubmissionQueueCardProps {
  submission: SubmissionQueueItem;
  onSelect: (submission: SubmissionQueueItem) => void;
  onModerationAction: (
    id: string,
    action: 'approve' | 'reject' | 'request_changes' | 'assign',
    data?: any
  ) => void;
}

/**
 * SubmissionDetailModal props interface
 */
interface SubmissionDetailModalProps {
  submission: SubmissionQueueItem;
  onClose: () => void;
  onModerationAction: (
    id: string,
    action: 'approve' | 'reject' | 'request_changes' | 'assign',
    data?: any
  ) => void;
}

/**
 * QueueAnalytics props interface
 */
interface QueueAnalyticsProps {
  stats: QueueStats | null;
}

/**
 * ModeratorManagement props interface
 */
interface ModeratorManagementProps {
  moderators: Array<{ id: string; name: string }>;
  stats: QueueStats | null;
}

/**
 * Admin Moderation Dashboard Component
 */
export default function AdminModerationPage(): JSX.Element {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<SubmissionQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [filters, setFilters] = useState<QueueFilters>({
    status: 'all',
    priority: 'all',
    assignedTo: 'all',
    fandom: 'all',
    dateRange: {},
    searchTerm: '',
    sortBy: 'submissionDate',
    sortOrder: 'desc',
  });
  const [selectedSubmission, setSelectedSubmission] =
    useState<SubmissionQueueItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [moderators, setModerators] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [fandoms, setFandoms] = useState<string[]>([]);

  /**
   * Load queue data on component mount and when filters change
   */
  useEffect(() => {
    loadQueueData();
    loadModerators();
    loadFandoms();
  }, [filters]);

  /**
   * Auto-refresh queue every 30 seconds
   */
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      loadQueueData();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, []);

  /**
   * Load submission queue data
   */
  const loadQueueData = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/admin/submissions/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load queue: ${response.statusText}`);
      }

      const data = await response.json();
      setSubmissions(data.submissions);
      setStats(data.stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load queue data'
      );
      console.error('Queue loading error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load available moderators
   */
  const loadModerators = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/users/moderators');
      if (response.ok) {
        const data = await response.json();
        setModerators(data.moderators);
      }
    } catch (error) {
      console.error('Failed to load moderators:', error);
    }
  };

  /**
   * Load available fandoms
   */
  const loadFandoms = async (): Promise<void> => {
    try {
      const response = await fetch('/api/admin/fandom');
      if (response.ok) {
        const data = await response.json();
        setFandoms(data.fandoms.map((f: any) => f.name));
      }
    } catch (error) {
      console.error('Failed to load fandoms:', error);
    }
  };

  /**
   * Handle moderation action
   */
  const handleModerationAction = async (
    submissionId: string,
    action: 'approve' | 'reject' | 'request_changes' | 'assign',
    data?: any
  ): Promise<void> => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `/api/admin/submissions/${submissionId}/moderate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, ...data }),
        }
      );

      if (!response.ok) {
        throw new Error(`Moderation action failed: ${response.statusText}`);
      }

      // Refresh queue data
      await loadQueueData();

      // Close detail modal if open
      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission(null);
      }

      // Show success notification
      // This would integrate with a notification system
      console.log(
        `Moderation action ${action} completed for submission ${submissionId}`
      );
    } catch (error) {
      console.error('Moderation action failed:', error);
      setError(
        error instanceof Error ? error.message : 'Moderation action failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle bulk actions
   */
  const handleBulkAction = async (
    submissionIds: string[],
    action: 'approve' | 'reject' | 'assign',
    data?: any
  ): Promise<void> => {
    try {
      setIsLoading(true);

      const response = await fetch('/api/admin/submissions/bulk-moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionIds, action, ...data }),
      });

      if (!response.ok) {
        throw new Error(`Bulk moderation failed: ${response.statusText}`);
      }

      await loadQueueData();
      console.log(
        `Bulk ${action} completed for ${submissionIds.length} submissions`
      );
    } catch (error) {
      console.error('Bulk moderation failed:', error);
      setError(
        error instanceof Error ? error.message : 'Bulk moderation failed'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Update filters
   */
  const updateFilters = useCallback(
    (newFilters: Partial<QueueFilters>): void => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    []
  );

  /**
   * Reset filters to defaults
   */
  const resetFilters = (): void => {
    setFilters({
      status: 'all',
      priority: 'all',
      assignedTo: 'all',
      fandom: 'all',
      dateRange: {},
      searchTerm: '',
      sortBy: 'submissionDate',
      sortOrder: 'desc',
    });
  };

  /**
   * Get status badge color
   */
  const getStatusBadgeColor = (status: SubmissionStatus): string => {
    switch (status as any) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under-review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'request-changes':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get priority badge color
   */
  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Moderation Dashboard</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadQueueData}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => router.push('/admin')}>Back to Admin</Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Pending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.totalPending}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Under Review
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalUnderReview}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Review Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {stats.averageReviewTime.toFixed(1)}d
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Oldest Submission
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  stats.oldestSubmissionDays > 7
                    ? 'text-red-600'
                    : 'text-gray-600'
                }`}
              >
                {stats.oldestSubmissionDays}d
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Submission Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="moderators">Moderators</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <Label htmlFor="status-filter">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={value =>
                      updateFilters({ status: value as any })
                    }
                  >
                    <SelectTrigger id="status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="changes_requested">
                        Changes Requested
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="priority-filter">Priority</Label>
                  <Select
                    value={filters.priority}
                    onValueChange={value => updateFilters({ priority: value })}
                  >
                    <SelectTrigger id="priority-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="assigned-filter">Assigned To</Label>
                  <Select
                    value={filters.assignedTo}
                    onValueChange={value =>
                      updateFilters({ assignedTo: value })
                    }
                  >
                    <SelectTrigger id="assigned-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Moderators</SelectItem>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {moderators.map(mod => (
                        <SelectItem key={mod.id} value={mod.id}>
                          {mod.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="fandom-filter">Fandom</Label>
                  <Select
                    value={filters.fandom}
                    onValueChange={value => updateFilters({ fandom: value })}
                  >
                    <SelectTrigger id="fandom-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Fandoms</SelectItem>
                      {fandoms.map(fandom => (
                        <SelectItem key={fandom} value={fandom}>
                          {fandom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Title, author, tags..."
                      value={filters.searchTerm}
                      onChange={e =>
                        updateFilters({ searchTerm: e.target.value })
                      }
                      className="pl-8"
                    />
                  </div>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={resetFilters}>
                    Reset Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submission Queue */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Submission Queue ({submissions.length})</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      /* TODO: Export queue */
                    }}
                  >
                    Export
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No submissions match the current filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {submissions.map(submission => (
                    <SubmissionQueueCard
                      key={submission.id}
                      submission={submission}
                      onSelect={setSelectedSubmission}
                      onModerationAction={handleModerationAction}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <QueueAnalytics stats={stats} />
        </TabsContent>

        <TabsContent value="moderators">
          <ModeratorManagement moderators={moderators} stats={stats} />
        </TabsContent>
      </Tabs>

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <SubmissionDetailModal
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onModerationAction={handleModerationAction}
        />
      )}
    </div>
  );
}

/**
 * Submission Queue Card Component
 */
function SubmissionQueueCard({
  submission,
  onSelect,
  onModerationAction,
}: SubmissionQueueCardProps): JSX.Element {
  const getStatusBadgeColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'under-review':
        return 'bg-blue-100 text-blue-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'request-changes':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityBadgeColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-blue-100 text-blue-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                className={getStatusBadgeColor(submission.status || 'pending')}
              >
                {submission.status?.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className={getPriorityBadgeColor(submission.priority)}>
                {submission.priority.toUpperCase()}
              </Badge>
              <span className="text-sm text-gray-500">
                #{submission.queuePosition}
              </span>
            </div>

            <h3
              className="font-medium text-lg mb-1 truncate cursor-pointer hover:text-blue-600"
              onClick={() => onSelect(submission)}
            >
              {submission.storyTitle}
            </h3>

            <p className="text-sm text-gray-600 mb-2">
              by {submission.authorName} • {submission.fandomId}
            </p>

            <p className="text-sm text-gray-500 line-clamp-2">
              {submission.summary}
            </p>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>{submission.wordCount?.toLocaleString() ?? 0} words</span>
              <span>{submission.tags?.length ?? 0} tags</span>
              {submission.qualityScore && (
                <span>Quality: {submission.qualityScore}%</span>
              )}
              <span>
                {new Date(
                  submission.submittedAt || new Date()
                ).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={e => {
                  e.stopPropagation();
                  onSelect(submission);
                }}
              >
                <Eye className="w-3 h-3" />
              </Button>

              {submission.githubIssue && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={e => {
                    e.stopPropagation();
                    if (submission.githubIssue?.url) {
                      window.open(submission.githubIssue.url, '_blank');
                    }
                  }}
                >
                  <ExternalLink className="w-3 h-3" />
                </Button>
              )}
            </div>

            {submission.status === 'pending' && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    onModerationAction(submission.id, 'approve');
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={e => {
                    e.stopPropagation();
                    onModerationAction(submission.id, 'reject');
                  }}
                >
                  <XCircle className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>

        {submission.assignedModerator && (
          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
            Assigned to: {submission.assignedModerator.name}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Submission Detail Modal Component
 */
function SubmissionDetailModal({
  submission,
  onClose,
  onModerationAction,
}: SubmissionDetailModalProps): JSX.Element {
  const [moderationNotes, setModerationNotes] = useState<string>('');
  const [selectedModerator, setSelectedModerator] = useState<string>('');

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{submission.storyTitle}</span>
            <div className="flex gap-2">
              <Badge className="bg-blue-100 text-blue-800">
                {submission.status?.replace('_', ' ').toUpperCase()}
              </Badge>
              <Badge className="bg-gray-100 text-gray-800">
                #{submission.queuePosition}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="font-medium mb-2">Story Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Author:</span>{' '}
                {submission.authorName}
              </div>
              <div>
                <span className="font-medium">Fandom:</span>{' '}
                {submission.fandomId}
              </div>
              <div>
                <span className="font-medium">Word Count:</span>{' '}
                {submission.wordCount?.toLocaleString() ?? 0}
              </div>
              <div>
                <span className="font-medium">Submitted:</span>{' '}
                {new Date(
                  submission.submittedAt || new Date()
                ).toLocaleDateString()}
              </div>
              <div className="col-span-2">
                <span className="font-medium">URL:</span>{' '}
                <a
                  href={submission.storyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {submission.storyUrl}
                </a>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
              {submission.summary}
            </p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="font-medium mb-2">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {(submission.tags || []).map((tag, index) => (
                <Badge key={index} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* GitHub Integration */}
          {submission.githubIssue && (
            <div>
              <h3 className="font-medium mb-2">GitHub Issue</h3>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex items-center justify-between">
                  <span>Issue #{submission.githubIssue.number}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (submission.githubIssue?.url) {
                        window.open(submission.githubIssue.url, '_blank');
                      }
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    View on GitHub
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Moderation Actions */}
          <div>
            <h3 className="font-medium mb-2">Moderation Actions</h3>
            <div className="space-y-3">
              <div>
                <Label htmlFor="moderation-notes">Notes</Label>
                <Textarea
                  id="moderation-notes"
                  placeholder="Add moderation notes..."
                  value={moderationNotes}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setModerationNotes(e.target.value)
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    onModerationAction(submission.id, 'approve', {
                      notes: moderationNotes,
                    });
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    onModerationAction(submission.id, 'reject', {
                      reason: moderationNotes,
                    });
                  }}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {
                    onModerationAction(submission.id, 'request_changes', {
                      notes: moderationNotes,
                    });
                  }}
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>
          </div>

          {/* Moderation History */}
          {submission.moderationHistory.length > 0 && (
            <div>
              <h3 className="font-medium mb-2">Moderation History</h3>
              <div className="space-y-2">
                {submission.moderationHistory.map((action, index) => (
                  <div
                    key={action.id}
                    className="text-sm bg-gray-50 p-2 rounded"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {action.actionType.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="text-gray-500">
                        {new Date(action.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-gray-600">by {action.actionBy}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Queue Analytics Component
 */
function QueueAnalytics({ stats }: QueueAnalyticsProps): JSX.Element {
  if (!stats) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Queue Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Stats Chart */}
            <div>
              <h3 className="font-medium mb-4">Daily Activity (Last 7 Days)</h3>
              <div className="space-y-2">
                {stats.dailyStats.slice(-7).map((day, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{new Date(day.date).toLocaleDateString()}</span>
                    <div className="flex gap-4">
                      <span className="text-blue-600">
                        +{day.submitted} submitted
                      </span>
                      <span className="text-green-600">
                        +{day.approved} approved
                      </span>
                      <span className="text-red-600">
                        +{day.rejected} rejected
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Queue Health */}
            <div>
              <h3 className="font-medium mb-4">Queue Health</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Processing Rate</span>
                  <span className="font-medium">
                    {(
                      (stats.totalApproved + stats.totalRejected) /
                      stats.averageReviewTime
                    ).toFixed(1)}
                    /day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Approval Rate</span>
                  <span className="font-medium text-green-600">
                    {(
                      (stats.totalApproved /
                        (stats.totalApproved + stats.totalRejected)) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Backlog Status</span>
                  <Badge
                    className={
                      stats.oldestSubmissionDays > 7
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }
                  >
                    {stats.oldestSubmissionDays > 7
                      ? 'Behind Schedule'
                      : 'On Track'}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Moderator Management Component
 */
function ModeratorManagement({
  moderators,
  stats,
}: ModeratorManagementProps): JSX.Element {
  if (!stats) {
    return <div>Loading moderator data...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Moderator Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.moderatorWorkload.map(moderator => (
              <div
                key={moderator.moderatorId}
                className="flex items-center justify-between p-3 bg-gray-50 rounded"
              >
                <div>
                  <div className="font-medium">{moderator.moderatorName}</div>
                  <div className="text-sm text-gray-600">
                    {moderator.assignedCount} assigned •{' '}
                    {moderator.completedToday} completed today
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {moderator.assignedCount} active
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
