/**
 * Content Validation Service
 *
 * Validates content structure, relationships, and business rules
 * across different content types.
 *
 * @package the-pensive-index
 */

export class ContentValidationService {
  /**
   * Validate content item structure
   */
  async validateContent(
    contentType: string,
    contentData: any
  ): Promise<{
    is_valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (contentType) {
      case 'tag':
        this.validateTag(contentData, errors, warnings);
        break;
      case 'plot_block':
        this.validatePlotBlock(contentData, errors, warnings);
        break;
      case 'character':
        this.validateCharacter(contentData, errors, warnings);
        break;
      case 'validation_rule':
        this.validateValidationRule(contentData, errors, warnings);
        break;
      default:
        warnings.push(`Unknown content type: ${contentType}`);
    }

    return {
      is_valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateTag(data: any, errors: string[], warnings: string[]): void {
    if (!data.name) {
      errors.push('Tag name is required');
    }
    if (data.relationships && !Array.isArray(data.relationships)) {
      errors.push('Tag relationships must be an array');
    }
  }

  private validatePlotBlock(
    data: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!data.name) {
      errors.push('Plot block name is required');
    }
    if (!data.description) {
      warnings.push('Plot block should have a description');
    }
  }

  private validateCharacter(
    data: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!data.name) {
      errors.push('Character name is required');
    }
    if (data.age && typeof data.age !== 'number') {
      errors.push('Character age must be a number');
    }
  }

  private validateValidationRule(
    data: any,
    errors: string[],
    warnings: string[]
  ): void {
    if (!data.rule) {
      errors.push('Validation rule content is required');
    }
    if (!data.type) {
      warnings.push('Validation rule type should be specified');
    }
  }
}
