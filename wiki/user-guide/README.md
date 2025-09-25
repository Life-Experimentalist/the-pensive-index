# User Guide

Welcome to The Pensieve Index - your gateway to discovering fanfiction that perfectly matches your tastes and creating detailed story prompts when library gaps exist.

## What is The Pensieve Index?

The Pensieve Index is a **library-first story discovery platform**. Unlike other platforms that rely on basic tags, we use:

- **Hierarchical Tagging**: Complex plot blocks with conditional branching
- **Existing Story Search**: Find precisely matching stories first
- **Intelligent Prompts**: Create detailed prompts only when needed
- **Community Curation**: Admin-managed content for quality assurance

## Getting Started

### 1. Understanding the Interface

#### Desktop Interface (Three Panels)
- **Left Panel**: Browse fandoms, tags, and plot blocks
- **Center Panel**: Build your story pathway by dragging elements
- **Right Panel**: View search results and story prompts

#### Mobile Interface
- **Tap-to-Select**: Touch-friendly alternative to drag-and-drop
- **Collapsible Panels**: Swipe between selection, pathway, and results
- **Same Features**: Full functionality on mobile devices

### 2. Building Your First Pathway

#### Step 1: Select Your Fandom
1. Choose your fandom from the dropdown (e.g., "Harry Potter")
2. Browse available tags and plot blocks for that fandom
3. Use the search function to find specific elements

#### Step 2: Add Basic Tags
- **Character Tags**: harry, hermione, draco
- **Relationship Tags**: harry/hermione, draco/hermione
- **Mood Tags**: angst, fluff, humor
- **Setting Tags**: hogwarts, post-war, alternate-universe

#### Step 3: Add Plot Blocks
Plot blocks represent major story elements with specific narrative implications:

**Example: Goblin Inheritance**
- Drag "Goblin Inheritance" to your pathway
- Choose conditions like "After Sirius Death" or "Emancipation Route"
- Select sub-elements like "Black Lordship" or "Potter Heritage"

### 3. Understanding Validation

#### During Selection
- Build any combination you want - no restrictions
- The system won't block impossible combinations
- Focus on what you're looking for, not technical constraints

#### When You're Done
1. Click "Finish Pathway" or "Complete"
2. The validation engine checks for conflicts
3. If conflicts exist, you'll see a helpful modal with:
   - Clear explanations of issues
   - Suggested fixes you can apply with one click
   - Option to proceed anyway

#### Common Validation Rules
- **Shipping Conflicts**: Multiple relationships with the same character may require "harem" tag
- **Plot Conflicts**: Some plot blocks are mutually exclusive
- **Prerequisites**: Some elements require others to be present first

## Using Search Results

### Story Discovery (Primary Feature)
When you complete your pathway, the system:

1. **Searches Existing Stories**: Finds tagged stories matching your criteria
2. **Shows Relevance Scores**: How well each story matches your pathway
3. **Provides Story Details**: Title, author, summary, external links
4. **Highlights Matches**: Shows which parts of your pathway each story contains

### Story Prompts (Secondary Feature)
Alongside search results, you'll always see:

1. **Create New Story Prompt**: Detailed prompt based on your pathway
2. **Novelty Highlights**: Unique aspects not found in existing stories
3. **Logical Consistency**: Prompts that make narrative sense
4. **Export Options**: Save pathway as JSON for later use

## Advanced Features

### Pathway Management
- **Save Pathways**: Export as JSON files
- **Load Pathways**: Import previously saved pathways
- **Share Pathways**: Send pathway links to others
- **Modify Searches**: Easily adjust and re-search

### Complex Plot Blocks
Some plot blocks have sophisticated branching:

**Goblin Inheritance Example:**
```
Goblin Inheritance
├── Black Lordship
│   ├── After Sirius Death → Black Head of Family
│   └── Emancipation Route → Triwizard Tournament
├── Slytherin Lordship
│   ├── Via Lily Potter Heritage
│   └── Via Voldemort Defeat (3+ times)
└── Multiple Houses → Hogwarts Control
```

### Tag Classes
Tags belong to classes for smart validation:
- `harry/hermione` belongs to both `harry-shipping` and `hermione-shipping`
- The system knows when you select conflicting relationships
- Automatic suggestions for required additional tags

## Tips for Better Results

### Effective Pathway Building
1. **Start Broad**: Begin with basic character and mood tags
2. **Add Specifics**: Include plot blocks for major story elements
3. **Be Realistic**: Not every combination exists in the library
4. **Experiment**: Try variations if initial searches are empty

### Understanding Results
- **High Relevance**: Stories matching most of your pathway
- **Partial Matches**: Stories with some elements but not all
- **Gap Indicators**: Areas where new stories could be written
- **Similar Suggestions**: Related pathways that have more results

### Using Prompts Effectively
- **Novelty Focus**: Pay attention to unique elements highlighted
- **Logical Flow**: Prompts show how elements connect narratively
- **Inspiration Tool**: Use as starting point, not rigid requirement
- **Community Value**: Write stories that fill identified gaps

## Community Features

### Story Submission
Help grow the library by submitting stories you find:

1. **Browser Extension**: Install our extension for easy submission
2. **Manual Forms**: Submit through the platform directly
3. **Pathway Tagging**: Tag stories using the same system
4. **Admin Review**: All submissions reviewed before addition

### Quality Assurance
- **Admin Curation**: Content managed by fandom experts
- **Validation Consistency**: Same rules for all submissions
- **Community Feedback**: Report mistagged or missing stories
- **Continuous Growth**: Library expands through community effort

## Troubleshooting

### No Search Results
- Try broader pathways with fewer specific elements
- Check if you're using conflicting plot blocks
- Consider that some combinations may genuinely not exist
- Use the prompt feature to inspire new story creation

### Validation Conflicts
- Read conflict explanations carefully
- Try suggested fixes first
- Understand that some combinations are logically impossible
- Contact admins if validation seems incorrect

### Performance Issues
- The platform targets 60fps on modern devices
- Validation should complete in under 200ms
- Search results should load in under 500ms
- Contact support if performance is consistently poor

## Getting Help

- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check other sections of this guide
- **Community Discussion**: Join our GitHub Discussions
- **Admin Contact**: For content-related questions

---

*Happy story hunting! Remember: we're library-first, so existing stories come before new prompts.*
