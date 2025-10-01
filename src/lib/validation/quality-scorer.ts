/**
 * Quality Scoring Service
 *
 * This service provides comprehensive quality scoring for story submissions
 * using multi-factor algorithms, configurable weights per fandom, and
 * various metrics like word count, completion status, and update frequency.
 */

import { getDatabase } from '../database';
import { storySubmissions } from '../database/schemas/submissions';
import { eq, sql, and, desc, count } from 'drizzle-orm';
import { CompletionStatus } from '../../types/submission';

export interface QualityScore {
  overallScore: number; // 0-100 scale
  breakdown: {
    contentQuality: number;
    metadataQuality: number;
    popularityIndicators: number;
    technicalQuality: number;
  };
  factors: QualityFactor[];
  confidence: number; // 0-1 scale
}

export interface QualityFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  contribution: number; // score * weight
  description: string;
}

export interface QualityMetrics {
  wordCount: number;
  chapterCount: number;
  completionStatus: CompletionStatus;
  lastUpdateDays: number;
  tagCount: number;
  summaryLength: number;
  titleLength: number;
  hasAuthorName: boolean;
  updateFrequency?: number; // chapters per day
  estimatedReadTime?: number; // minutes
}

export interface QualityScoringConfig {
  // Fandom-specific weights
  fandomId?: string;

  // Content quality weights
  wordCountWeight: number; // 0.25 default
  completionStatusWeight: number; // 0.20 default
  updateFrequencyWeight: number; // 0.15 default

  // Metadata quality weights
  summaryQualityWeight: number; // 0.15 default
  tagCountWeight: number; // 0.10 default
  titleQualityWeight: number; // 0.05 default

  // Technical quality weights
  metadataCompletenessWeight: number; // 0.10 default

  // Quality thresholds
  minimumWordCount: number; // 1000 default
  optimalWordCountRange: [number, number]; // [5000, 50000] default
  minimumSummaryLength: number; // 50 default
  minimumTagCount: number; // 3 default
  maxStalenessDays: number; // 365 default
}

export class QualityScorer {
  private config: QualityScoringConfig;
  private fandomConfigs: Map<string, Partial<QualityScoringConfig>> = new Map();

  constructor(config: Partial<QualityScoringConfig> = {}) {
    this.config = {
      wordCountWeight: 0.25,
      completionStatusWeight: 0.2,
      updateFrequencyWeight: 0.15,
      summaryQualityWeight: 0.15,
      tagCountWeight: 0.1,
      titleQualityWeight: 0.05,
      metadataCompletenessWeight: 0.1,
      minimumWordCount: 1000,
      optimalWordCountRange: [5000, 50000],
      minimumSummaryLength: 50,
      minimumTagCount: 3,
      maxStalenessDays: 365,
      ...config,
    };
  }

  /**
   * Calculate quality score for a story submission
   */
  async calculateQualityScore(
    submissionId: string,
    metrics?: QualityMetrics
  ): Promise<QualityScore> {
    try {
      // Get submission data if metrics not provided
      let submissionMetrics = metrics;
      if (!submissionMetrics) {
        submissionMetrics = await this.extractMetricsFromSubmission(
          submissionId
        );
      }

      // Get fandom-specific config if applicable
      const db = await getDatabase();
      const [submission] = await db
        .select()
        .from(storySubmissions)
        .where(eq(storySubmissions.id, submissionId))
        .limit(1);

      const fandomConfig = submission?.fandomId
        ? this.fandomConfigs.get(submission.fandomId)
        : {};
      const effectiveConfig = { ...this.config, ...fandomConfig };

      // Calculate individual quality factors
      const factors = await this.calculateQualityFactors(
        submissionMetrics,
        effectiveConfig
      );

      // Calculate weighted overall score
      const totalWeight = factors.reduce(
        (sum, factor) => sum + factor.weight,
        0
      );
      const weightedScore = factors.reduce(
        (sum, factor) => sum + factor.contribution,
        0
      );
      const overallScore =
        totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

      // Calculate confidence based on available data
      const confidence = this.calculateScoreConfidence(
        submissionMetrics,
        factors
      );

      // Breakdown by category
      const breakdown = this.calculateBreakdown(factors);

      return {
        overallScore: Math.max(0, Math.min(100, overallScore)),
        breakdown,
        factors,
        confidence,
      };
    } catch (error) {
      console.error('Quality scoring failed:', error);
      return this.getDefaultScore();
    }
  }

  /**
   * Extract metrics from a submission record
   */
  private async extractMetricsFromSubmission(
    submissionId: string
  ): Promise<QualityMetrics> {
    const db = await getDatabase();

    const [submission] = await db
      .select()
      .from(storySubmissions)
      .where(eq(storySubmissions.id, submissionId))
      .limit(1);

    if (!submission) {
      throw new Error(`Submission not found: ${submissionId}`);
    }

    const now = new Date();
    const submittedAt = new Date(submission.submittedAt);
    const lastUpdate = submission.lastUpdateDate
      ? new Date(submission.lastUpdateDate)
      : submittedAt;
    const daysSinceUpdate = Math.floor(
      (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate update frequency if we have both chapter count and time data
    let updateFrequency: number | undefined;
    if (
      submission.chapterCount &&
      submission.chapterCount > 1 &&
      submission.lastUpdateDate
    ) {
      const totalDays = Math.floor(
        (lastUpdate.getTime() - submittedAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (totalDays > 0) {
        updateFrequency = (submission.chapterCount - 1) / totalDays; // chapters per day
      }
    }

    // Estimate read time (average 200 words per minute)
    const estimatedReadTime = submission.wordCount
      ? Math.ceil(submission.wordCount / 200)
      : undefined;

    return {
      wordCount: submission.wordCount || 0,
      chapterCount: submission.chapterCount || 1,
      completionStatus:
        (submission.completionStatus as CompletionStatus) ||
        CompletionStatus.UNKNOWN,
      lastUpdateDays: daysSinceUpdate,
      tagCount: submission.tags?.length || 0,
      summaryLength: submission.summary?.length || 0,
      titleLength: submission.storyTitle?.length || 0,
      hasAuthorName: Boolean(submission.authorName?.trim()),
      updateFrequency,
      estimatedReadTime,
    };
  }

  /**
   * Calculate individual quality factors
   */
  private async calculateQualityFactors(
    metrics: QualityMetrics,
    config: QualityScoringConfig
  ): Promise<QualityFactor[]> {
    const factors: QualityFactor[] = [];

    // Word Count Quality
    const wordCountScore = this.scoreWordCount(metrics.wordCount, config);
    factors.push({
      name: 'Word Count',
      score: wordCountScore,
      weight: config.wordCountWeight,
      contribution: wordCountScore * config.wordCountWeight,
      description: `${metrics.wordCount.toLocaleString()} words`,
    });

    // Completion Status Quality
    const completionScore = this.scoreCompletionStatus(
      metrics.completionStatus
    );
    factors.push({
      name: 'Completion Status',
      score: completionScore,
      weight: config.completionStatusWeight,
      contribution: completionScore * config.completionStatusWeight,
      description: `Story is ${metrics.completionStatus}`,
    });

    // Update Frequency Quality
    const updateScore = this.scoreUpdateFrequency(
      metrics.lastUpdateDays,
      metrics.updateFrequency,
      config
    );
    factors.push({
      name: 'Update Frequency',
      score: updateScore,
      weight: config.updateFrequencyWeight,
      contribution: updateScore * config.updateFrequencyWeight,
      description: `Last updated ${metrics.lastUpdateDays} days ago`,
    });

    // Summary Quality
    const summaryScore = this.scoreSummaryQuality(
      metrics.summaryLength,
      config
    );
    factors.push({
      name: 'Summary Quality',
      score: summaryScore,
      weight: config.summaryQualityWeight,
      contribution: summaryScore * config.summaryQualityWeight,
      description: `${metrics.summaryLength} character summary`,
    });

    // Tag Count Quality
    const tagScore = this.scoreTagCount(metrics.tagCount, config);
    factors.push({
      name: 'Tag Count',
      score: tagScore,
      weight: config.tagCountWeight,
      contribution: tagScore * config.tagCountWeight,
      description: `${metrics.tagCount} tags provided`,
    });

    // Title Quality
    const titleScore = this.scoreTitleQuality(metrics.titleLength);
    factors.push({
      name: 'Title Quality',
      score: titleScore,
      weight: config.titleQualityWeight,
      contribution: titleScore * config.titleQualityWeight,
      description: `${metrics.titleLength} character title`,
    });

    // Metadata Completeness
    const metadataScore = this.scoreMetadataCompleteness(metrics);
    factors.push({
      name: 'Metadata Completeness',
      score: metadataScore,
      weight: config.metadataCompletenessWeight,
      contribution: metadataScore * config.metadataCompletenessWeight,
      description: 'Required metadata fields present',
    });

    return factors;
  }

  /**
   * Score based on word count
   */
  private scoreWordCount(
    wordCount: number,
    config: QualityScoringConfig
  ): number {
    if (wordCount < config.minimumWordCount) {
      return Math.max(0, (wordCount / config.minimumWordCount) * 30); // 0-30 for below minimum
    }

    const [optimalMin, optimalMax] = config.optimalWordCountRange;

    if (wordCount >= optimalMin && wordCount <= optimalMax) {
      return 100; // Optimal range
    }

    if (wordCount < optimalMin) {
      // Between minimum and optimal minimum
      const progress =
        (wordCount - config.minimumWordCount) /
        (optimalMin - config.minimumWordCount);
      return 30 + progress * 70; // 30-100
    }

    // Above optimal maximum - diminishing returns
    const excessRatio = (wordCount - optimalMax) / optimalMax;
    return Math.max(70, 100 - excessRatio * 30); // Gradually decrease from 100 to 70
  }

  /**
   * Score based on completion status
   */
  private scoreCompletionStatus(status: CompletionStatus): number {
    switch (status) {
      case CompletionStatus.COMPLETE:
        return 100;
      case CompletionStatus.IN_PROGRESS:
        return 75;
      case CompletionStatus.ABANDONED:
        return 20;
      case CompletionStatus.UNKNOWN:
      default:
        return 50;
    }
  }

  /**
   * Score based on update frequency and staleness
   */
  private scoreUpdateFrequency(
    daysSinceUpdate: number,
    updateFrequency: number | undefined,
    config: QualityScoringConfig
  ): number {
    let stalenessScore = 100;

    // Penalize staleness
    if (daysSinceUpdate > config.maxStalenessDays) {
      stalenessScore = 20; // Very stale
    } else if (daysSinceUpdate > config.maxStalenessDays / 2) {
      const staleness = daysSinceUpdate / config.maxStalenessDays;
      stalenessScore = Math.max(20, 100 - staleness * 80);
    }

    // Bonus for good update frequency
    let frequencyScore = 50; // Neutral if no data
    if (updateFrequency !== undefined) {
      if (updateFrequency > 0.1) {
        // More than once per 10 days
        frequencyScore = 100;
      } else if (updateFrequency > 0.03) {
        // More than once per month
        frequencyScore = 80;
      } else if (updateFrequency > 0.01) {
        // More than once per 100 days
        frequencyScore = 60;
      } else {
        frequencyScore = 30;
      }
    }

    // Combine staleness and frequency (weighted 70/30)
    return Math.round(stalenessScore * 0.7 + frequencyScore * 0.3);
  }

  /**
   * Score based on summary quality
   */
  private scoreSummaryQuality(
    summaryLength: number,
    config: QualityScoringConfig
  ): number {
    if (summaryLength === 0) {
      return 0;
    }

    if (summaryLength < config.minimumSummaryLength) {
      return (summaryLength / config.minimumSummaryLength) * 60;
    }

    // Optimal range 50-300 characters
    if (summaryLength >= 50 && summaryLength <= 300) {
      return 100;
    }

    if (summaryLength > 300) {
      // Diminishing returns for very long summaries
      const excess = summaryLength - 300;
      return Math.max(60, 100 - (excess / 50) * 10);
    }

    return 60;
  }

  /**
   * Score based on tag count
   */
  private scoreTagCount(
    tagCount: number,
    config: QualityScoringConfig
  ): number {
    if (tagCount === 0) {
      return 0;
    }

    if (tagCount < config.minimumTagCount) {
      return (tagCount / config.minimumTagCount) * 50;
    }

    // Optimal range 3-15 tags
    if (tagCount >= 3 && tagCount <= 15) {
      return 100;
    }

    if (tagCount > 15) {
      // Too many tags might indicate spam
      const excess = tagCount - 15;
      return Math.max(60, 100 - excess * 5);
    }

    return 50;
  }

  /**
   * Score based on title quality
   */
  private scoreTitleQuality(titleLength: number): number {
    if (titleLength === 0) {
      return 0;
    }

    // Optimal range 10-80 characters
    if (titleLength >= 10 && titleLength <= 80) {
      return 100;
    }

    if (titleLength < 10) {
      return (titleLength / 10) * 70;
    }

    if (titleLength > 80) {
      const excess = titleLength - 80;
      return Math.max(50, 100 - excess * 2);
    }

    return 70;
  }

  /**
   * Score based on metadata completeness
   */
  private scoreMetadataCompleteness(metrics: QualityMetrics): number {
    let score = 0;
    let totalChecks = 0;

    // Required fields
    const checks = [
      metrics.hasAuthorName,
      metrics.summaryLength > 0,
      metrics.tagCount > 0,
      metrics.wordCount > 0,
      metrics.titleLength > 0,
    ];

    totalChecks = checks.length;
    score = checks.filter(Boolean).length;

    return (score / totalChecks) * 100;
  }

  /**
   * Calculate confidence in the score
   */
  private calculateScoreConfidence(
    metrics: QualityMetrics,
    factors: QualityFactor[]
  ): number {
    let confidence = 1.0;

    // Reduce confidence for missing data
    if (metrics.wordCount === 0) confidence -= 0.2;
    if (metrics.summaryLength === 0) confidence -= 0.1;
    if (metrics.tagCount === 0) confidence -= 0.1;
    if (!metrics.updateFrequency) confidence -= 0.05;

    // Reduce confidence for very new submissions
    if (metrics.lastUpdateDays < 1) confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Calculate breakdown by category
   */
  private calculateBreakdown(
    factors: QualityFactor[]
  ): QualityScore['breakdown'] {
    const contentFactors = [
      'Word Count',
      'Completion Status',
      'Update Frequency',
    ];
    const metadataFactors = ['Summary Quality', 'Tag Count', 'Title Quality'];
    const technicalFactors = ['Metadata Completeness'];

    const calculateCategoryScore = (categoryFactors: string[]) => {
      const categoryItems = factors.filter(f =>
        categoryFactors.includes(f.name)
      );
      if (categoryItems.length === 0) return 0;

      const totalWeight = categoryItems.reduce((sum, f) => sum + f.weight, 0);
      const weightedScore = categoryItems.reduce(
        (sum, f) => sum + f.contribution,
        0
      );

      return totalWeight > 0
        ? Math.round((weightedScore / totalWeight) * 100)
        : 0;
    };

    return {
      contentQuality: calculateCategoryScore(contentFactors),
      metadataQuality: calculateCategoryScore(metadataFactors),
      popularityIndicators: 50, // Placeholder - would need view/kudos data
      technicalQuality: calculateCategoryScore(technicalFactors),
    };
  }

  /**
   * Get default score for errors
   */
  private getDefaultScore(): QualityScore {
    return {
      overallScore: 50,
      breakdown: {
        contentQuality: 50,
        metadataQuality: 50,
        popularityIndicators: 50,
        technicalQuality: 50,
      },
      factors: [],
      confidence: 0.1,
    };
  }

  /**
   * Configure fandom-specific scoring weights
   */
  setFandomConfig(
    fandomId: string,
    config: Partial<QualityScoringConfig>
  ): void {
    this.fandomConfigs.set(fandomId, config);
  }

  /**
   * Get fandom configuration
   */
  getFandomConfig(fandomId: string): Partial<QualityScoringConfig> | undefined {
    return this.fandomConfigs.get(fandomId);
  }

  /**
   * Update global configuration
   */
  updateConfig(newConfig: Partial<QualityScoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): QualityScoringConfig {
    return { ...this.config };
  }

  /**
   * Batch scoring for multiple submissions
   */
  async batchCalculateQualityScores(
    submissionIds: string[]
  ): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();

    for (const submissionId of submissionIds) {
      try {
        const score = await this.calculateQualityScore(submissionId);
        results.set(submissionId, score);
      } catch (error) {
        console.error(`Failed to score submission ${submissionId}:`, error);
        results.set(submissionId, this.getDefaultScore());
      }
    }

    return results;
  }
}

// Export singleton instance
export const qualityScorer = new QualityScorer();
