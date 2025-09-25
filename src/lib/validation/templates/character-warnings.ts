/**
 * Character Dynamic Warning Templates
 *
 * Predefined warning rules for common character relationship conflicts
 * with plot developments, focusing on maintaining character consistency.
 */

export const characterWarningTemplates = [
  {
    id: 'ron-harry-friendship-lord-conflict',
    name: 'Ron-Harry Friendship with Lord Harry Warning',
    description:
      'Warns about potential conflicts when Harry gains lordship while maintaining friendship with jealous Ron',
    category: 'character_dynamics' as const,
    severity: 'warning' as const,
    conditions: [
      {
        conditionType: 'tag_combination' as const,
        targetType: 'tag' as const,
        targetIds: ['ron-weasley', 'harry-potter', 'friendship'],
        operator: 'contains_all' as const,
        value: null,
      },
      {
        conditionType: 'plot_block_presence' as const,
        targetType: 'plot_block' as const,
        targetIds: ['goblin-inheritance', 'lord-potter', 'emancipation'],
        operator: 'contains_any' as const,
        value: null,
      },
    ],
    actions: [
      {
        actionType: 'warn_plot_development' as const,
        targetType: 'message' as const,
        targetIds: [],
        severity: 'warning' as const,
        message:
          "Ron-Harry friendship may conflict with Harry's newfound lordship due to Ron's jealousy",
        parameters: {
          plotGuidance: {
            warningType: 'character_dynamic',
            riskLevel: 'high',
            conflictDescription:
              "Ron Weasley is canonically shown to be jealous of Harry's fame, money, and achievements. When Harry gains lordship, wealth, or political power, this typically triggers Ron's jealousy and can destroy their friendship if not handled carefully.",
            rectificationStrategies: [
              {
                strategy:
                  'Send Ron away temporarily (international chess school, Quidditch training abroad)',
                difficulty: 'moderate',
                example:
                  'Ron receives invitation to train with Viktor Krum in Bulgaria, removing him from immediate conflict',
              },
              {
                strategy: 'Give Ron parallel advancement or recognition',
                difficulty: 'difficult',
                example:
                  'Ron discovers his own magical heritage or receives recognition for strategic thinking',
              },
              {
                strategy: 'Address jealousy directly through character growth',
                difficulty: 'difficult',
                example:
                  'Ron confronts his insecurities after seeing Harry struggle with lordship responsibilities',
              },
              {
                strategy: 'Gradual revelation with Ron helping Harry adapt',
                difficulty: 'easy',
                example:
                  'Ron learns about inheritance slowly and helps Harry navigate new responsibilities',
              },
            ],
            continuationWarnings: [
              'If Ron returns from absence, reintroduction must feel natural and show character growth',
              'Sudden reconciliation without addressing core jealousy issues will feel forced',
              'Ron remaining absent permanently may feel out of character unless well-justified',
              'Power imbalance must be acknowledged rather than ignored',
            ],
          },
        },
      },
    ],
  },
  {
    id: 'hermione-harry-romance-ron-conflict',
    name: 'Hermione-Harry Romance with Ron Friendship Warning',
    description:
      "Warns about potential conflicts when Harry and Hermione become romantic while maintaining Ron's friendship",
    category: 'character_dynamics' as const,
    severity: 'warning' as const,
    conditions: [
      {
        conditionType: 'tag_combination' as const,
        targetType: 'tag' as const,
        targetIds: ['harry-potter', 'hermione-granger', 'romance'],
        operator: 'contains_all' as const,
        value: null,
      },
      {
        conditionType: 'tag_presence' as const,
        targetType: 'tag' as const,
        targetIds: ['ron-weasley', 'friendship'],
        operator: 'contains_all' as const,
        value: null,
      },
    ],
    actions: [
      {
        actionType: 'provide_guidance' as const,
        targetType: 'message' as const,
        targetIds: [],
        severity: 'warning' as const,
        message:
          "Harry-Hermione romance may complicate trio dynamics, especially with Ron's canonical feelings",
        parameters: {
          characterDynamics: {
            characters: ['Harry Potter', 'Hermione Granger', 'Ron Weasley'],
            relationshipType: 'friendship',
            conflictTriggers: [
              'romantic jealousy',
              'feeling left out',
              'changed group dynamics',
            ],
            guidanceNote:
              "Ron has shown romantic interest in Hermione and may feel betrayed or excluded. Consider how this affects the trio's dynamic and Ron's character development.",
          },
        },
      },
    ],
  },
  {
    id: 'dumbledore-bashing-mentor-relationship',
    name: 'Dumbledore Bashing with Mentor Relationship Warning',
    description:
      'Warns about inconsistency when portraying Dumbledore negatively while maintaining mentor role',
    category: 'character_dynamics' as const,
    severity: 'warning' as const,
    conditions: [
      {
        conditionType: 'tag_combination' as const,
        targetType: 'tag' as const,
        targetIds: ['dumbledore-bashing', 'manipulative-dumbledore'],
        operator: 'contains_any' as const,
        value: null,
      },
      {
        conditionType: 'tag_presence' as const,
        targetType: 'tag' as const,
        targetIds: ['mentor-dumbledore', 'wise-dumbledore'],
        operator: 'contains_any' as const,
        value: null,
      },
    ],
    actions: [
      {
        actionType: 'warn_plot_development' as const,
        targetType: 'message' as const,
        targetIds: [],
        severity: 'warning' as const,
        message: 'Contradictory portrayals of Dumbledore may confuse readers',
        parameters: {
          plotGuidance: {
            warningType: 'character_consistency',
            riskLevel: 'medium',
            conflictDescription:
              'Portraying Dumbledore as both manipulative/evil and wise mentor creates character inconsistency that may confuse readers.',
            rectificationStrategies: [
              {
                strategy:
                  'Choose one consistent portrayal throughout the story',
                difficulty: 'easy',
                example:
                  'Decide if Dumbledore is manipulative or truly wise and stick to it',
              },
              {
                strategy: 'Show character evolution or revelation',
                difficulty: 'moderate',
                example:
                  "Harry discovers Dumbledore's manipulation over time, changing their relationship",
              },
              {
                strategy: 'Present complex character with both traits',
                difficulty: 'difficult',
                example:
                  'Dumbledore makes hard choices that seem manipulative but come from good intentions',
              },
            ],
            continuationWarnings: [
              'Avoid sudden character switches without explanation',
              'Reader confusion may result from contradictory character traits',
              "Establish clear motivation for Dumbledore's actions early",
            ],
          },
        },
      },
    ],
  },
  {
    id: 'snape-father-figure-abuse-history',
    name: 'Snape as Father Figure with Abuse History Warning',
    description:
      'Warns about potential issues when making Snape a father figure given his canonical treatment of Harry',
    category: 'character_dynamics' as const,
    severity: 'warning' as const,
    conditions: [
      {
        conditionType: 'tag_combination' as const,
        targetType: 'tag' as const,
        targetIds: ['severus-snape', 'father-figure', 'mentor'],
        operator: 'contains_any' as const,
        value: null,
      },
      {
        conditionType: 'tag_presence' as const,
        targetType: 'tag' as const,
        targetIds: ['harry-potter'],
        operator: 'contains' as const,
        value: null,
      },
    ],
    actions: [
      {
        actionType: 'warn_plot_development' as const,
        targetType: 'message' as const,
        targetIds: [],
        severity: 'warning' as const,
        message:
          'Snape as father figure requires addressing his canonical mistreatment of Harry',
        parameters: {
          plotGuidance: {
            warningType: 'character_dynamic',
            riskLevel: 'high',
            conflictDescription:
              'Snape canonically psychologically abused Harry throughout school. Making him a father figure without addressing this history can feel jarring and unrealistic.',
            rectificationStrategies: [
              {
                strategy:
                  "Provide clear explanation for Snape's behavior change",
                difficulty: 'moderate',
                example:
                  'Time travel where Snape gets a second chance and regrets his past actions',
              },
              {
                strategy: 'Address the abuse history directly',
                difficulty: 'difficult',
                example:
                  'Snape apologizes and works to make amends for his past treatment',
              },
              {
                strategy: 'AU where Snape never had reason to hate Harry',
                difficulty: 'easy',
                example:
                  'James Potter never bullied Snape, or Lily lived and intervened',
              },
              {
                strategy:
                  'Gradual relationship building with acknowledgment of past',
                difficulty: 'difficult',
                example:
                  'Slow trust-building where both characters grow and change',
              },
            ],
            continuationWarnings: [
              'Sudden personality change without explanation will feel forced',
              'Readers may struggle to accept Snape as caring without character development',
              'Past abuse cannot be simply ignored for relationship to feel authentic',
              "Consider Harry's trauma response to his former abuser",
            ],
          },
        },
      },
    ],
  },
  {
    id: 'independent-harry-mentor-figures',
    name: 'Independent Harry with Multiple Mentors Warning',
    description:
      "Warns about potential contradiction between Harry's independence and reliance on mentors",
    category: 'plot_consistency' as const,
    severity: 'warning' as const,
    conditions: [
      {
        conditionType: 'tag_presence' as const,
        targetType: 'tag' as const,
        targetIds: ['independent-harry', 'powerful-harry'],
        operator: 'contains_any' as const,
        value: null,
      },
      {
        conditionType: 'tag_combination' as const,
        targetType: 'tag' as const,
        targetIds: ['mentor', 'father-figure', 'wise-guide'],
        operator: 'contains_multiple' as const,
        value: 2,
      },
    ],
    actions: [
      {
        actionType: 'suggest_alternatives' as const,
        targetType: 'tag' as const,
        targetIds: ['advisor', 'ally', 'partner'],
        severity: 'warning' as const,
        message: "Consider if multiple mentors contradict Harry's independence",
        parameters: {
          alternatives: ['advisor', 'ally', 'equal-partner', 'consultant'],
          reason:
            'Too many mentors may undermine the independent Harry characterization',
        },
      },
    ],
  },
];

export const getWarningTemplateByTags = (
  tags: string[],
  plotBlocks: string[]
) => {
  return characterWarningTemplates.filter(template => {
    return template.conditions.some(condition => {
      if (condition.targetType === 'tag') {
        const hasRequiredTags = condition.targetIds.every(tagId =>
          tags.includes(tagId)
        );
        return hasRequiredTags;
      }
      if (condition.targetType === 'plot_block') {
        const hasRequiredBlocks = condition.targetIds.some(blockId =>
          plotBlocks.includes(blockId)
        );
        return hasRequiredBlocks;
      }
      return false;
    });
  });
};

export const getWarningsByCategory = (category: string) => {
  return characterWarningTemplates.filter(
    template => template.category === category
  );
};
