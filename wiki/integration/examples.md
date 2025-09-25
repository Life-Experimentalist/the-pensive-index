# Integration Examples

This guide provides practical examples of integrating with The Pensieve Index API and components.

## API Integration Examples

### Story Search Integration

#### Basic Search Request

```javascript
// Basic story search with pathway
async function searchStories(fandomId, pathway) {
  const response = await fetch('/api/stories/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fandomId,
      pathway: {
        tags: pathway.selectedTags,
        plotBlocks: pathway.selectedPlotBlocks,
        characters: pathway.selectedCharacters
      },
      filters: {
        wordCount: { min: 50000 },
        status: 'complete'
      }
    })
  });

  return await response.json();
}

// Usage
const results = await searchStories('harry-potter', {
  selectedTags: ['angst', 'time-travel'],
  selectedPlotBlocks: ['goblin-inheritance'],
  selectedCharacters: ['harry-potter', 'hermione-granger']
});

console.log(`Found ${results.stories.length} matching stories`);
```

#### Advanced Search with Scoring

```typescript
interface SearchConfig {
  fandomId: string;
  pathway: PathwayConfig;
  scoring: {
    requireAllTags?: boolean;
    minimumMatchScore?: number;
    preferCompleteStories?: boolean;
  };
}

async function advancedStorySearch(config: SearchConfig): Promise<SearchResults> {
  const { fandomId, pathway, scoring } = config;

  const searchPayload = {
    fandomId,
    pathway,
    filters: {
      status: scoring.preferCompleteStories ? 'complete' : undefined,
    },
    scoring: {
      algorithm: 'weighted',
      minimumScore: scoring.minimumMatchScore || 0.5,
      tagMatchRequired: scoring.requireAllTags || false
    }
  };

  const response = await fetch('/api/stories/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(searchPayload)
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return await response.json();
}

// Example usage
const preciseSearch = await advancedStorySearch({
  fandomId: 'harry-potter',
  pathway: {
    tags: ['angst', 'time-travel', 'harry/hermione'],
    plotBlocks: ['goblin-inheritance']
  },
  scoring: {
    requireAllTags: true,
    minimumMatchScore: 0.8,
    preferCompleteStories: true
  }
});
```

### Pathway Validation Integration

#### Real-time Validation

```typescript
import { useState, useEffect } from 'react';

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

function usePathwayValidation(fandomId: string, pathway: PathwayConfig) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const validatePathway = async () => {
      if (!pathway.tags.length && !pathway.plotBlocks.length) {
        setValidation(null);
        return;
      }

      setIsValidating(true);

      try {
        const response = await fetch('/api/pathways/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fandomId, pathway })
        });

        const result = await response.json();
        setValidation(result);
      } catch (error) {
        console.error('Validation failed:', error);
        setValidation({
          isValid: false,
          errors: [{ type: 'network_error', message: 'Validation unavailable' }],
          warnings: []
        });
      } finally {
        setIsValidating(false);
      }
    };

    // Debounce validation calls
    const timer = setTimeout(validatePathway, 300);
    return () => clearTimeout(timer);
  }, [fandomId, pathway]);

  return { validation, isValidating };
}

// Component usage
function PathwayBuilder({ fandomId }: { fandomId: string }) {
  const [pathway, setPathway] = useState<PathwayConfig>({
    tags: [],
    plotBlocks: [],
    characters: []
  });

  const { validation, isValidating } = usePathwayValidation(fandomId, pathway);

  return (
    <div className="pathway-builder">
      {/* Pathway building interface */}
      <PathwayInterface pathway={pathway} onChange={setPathway} />

      {/* Validation feedback */}
      {isValidating && <div className="text-gray-500">Validating...</div>}

      {validation && !validation.isValid && (
        <div className="validation-errors">
          {validation.errors.map((error, index) => (
            <div key={index} className="error-message text-red-600">
              {error.message}
            </div>
          ))}
        </div>
      )}

      {validation?.warnings.map((warning, index) => (
        <div key={index} className="warning-message text-yellow-600">
          {warning.message}
        </div>
      ))}
    </div>
  );
}
```

#### Batch Validation

```typescript
async function validateMultiplePathways(
  fandomId: string,
  pathways: PathwayConfig[]
): Promise<ValidationResult[]> {
  const validationPromises = pathways.map(pathway =>
    fetch('/api/pathways/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fandomId, pathway })
    }).then(res => res.json())
  );

  try {
    return await Promise.all(validationPromises);
  } catch (error) {
    console.error('Batch validation failed:', error);
    return pathways.map(() => ({
      isValid: false,
      errors: [{ type: 'validation_error', message: 'Validation failed' }],
      warnings: []
    }));
  }
}
```

### Story Submission Integration

#### Browser Extension Integration

```typescript
// Content script for story submission
class StoryExtractor {
  static extractFromAO3(): StoryData | null {
    const titleElement = document.querySelector('h2.title');
    const authorElement = document.querySelector('a[rel="author"]');
    const summaryElement = document.querySelector('.summary blockquote');
    const statsElement = document.querySelector('dl.stats');

    if (!titleElement || !authorElement) return null;

    return {
      title: titleElement.textContent?.trim() || '',
      author: authorElement.textContent?.trim() || '',
      url: window.location.href,
      summary: summaryElement?.textContent?.trim() || '',
      wordCount: this.extractWordCount(statsElement),
      rating: this.extractRating(),
      status: this.extractStatus(statsElement)
    };
  }

  static extractFromFFN(): StoryData | null {
    // Similar extraction logic for FanFiction.Net
    const titleElement = document.querySelector('#profile_top b.xcontrast_txt');
    const authorElement = document.querySelector('#profile_top a.xcontrast_txt');

    if (!titleElement || !authorElement) return null;

    return {
      title: titleElement.textContent?.trim() || '',
      author: authorElement.textContent?.trim() || '',
      url: window.location.href,
      summary: this.extractSummary(),
      wordCount: this.extractWordCountFFN(),
      rating: this.extractRatingFFN(),
      status: this.extractStatusFFN()
    };
  }

  private static extractWordCount(statsElement: Element | null): number {
    const wordText = statsElement?.querySelector('dd.words')?.textContent;
    return wordText ? parseInt(wordText.replace(/,/g, ''), 10) : 0;
  }
}

// Extension popup integration
async function submitCurrentStory() {
  try {
    // Extract story data from current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const storyData = await chrome.scripting.executeScript({
      target: { tabId: tab.id! },
      func: () => {
        // Detect site and extract accordingly
        if (window.location.hostname.includes('archiveofourown.org')) {
          return StoryExtractor.extractFromAO3();
        } else if (window.location.hostname.includes('fanfiction.net')) {
          return StoryExtractor.extractFromFFN();
        }
        return null;
      }
    });

    if (!storyData[0].result) {
      throw new Error('Could not extract story data from this page');
    }

    // Submit to Pensieve Index
    const response = await fetch('https://pensieve-index.com/api/stories/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        story: storyData[0].result,
        tags: selectedTags,
        plotBlocks: selectedPlotBlocks,
        submissionNotes: document.getElementById('notes').value
      })
    });

    const result = await response.json();

    if (response.ok) {
      showSuccess(`Story submitted! GitHub issue #${result.githubIssue.number} created.`);
    } else {
      showError(result.error.message);
    }

  } catch (error) {
    showError(`Submission failed: ${error.message}`);
  }
}
```

## Component Integration Examples

### Drag-and-Drop Pathway Builder

```typescript
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { useState } from 'react';

interface PathwayBuilderProps {
  fandomData: FandomData;
  onPathwayChange: (pathway: PathwayConfig) => void;
}

function PathwayBuilder({ fandomData, onPathwayChange }: PathwayBuilderProps) {
  const [pathway, setPathway] = useState<PathwayConfig>({
    tags: [],
    plotBlocks: [],
    characters: []
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    const draggedItem = active.data.current;
    const dropZone = over.id as string;

    if (dropZone === 'pathway-builder') {
      const newPathway = { ...pathway };

      switch (draggedItem.type) {
        case 'tag':
          if (!newPathway.tags.includes(draggedItem.id)) {
            newPathway.tags.push(draggedItem.id);
          }
          break;
        case 'plotBlock':
          if (!newPathway.plotBlocks.includes(draggedItem.id)) {
            newPathway.plotBlocks.push(draggedItem.id);
          }
          break;
        case 'character':
          if (!newPathway.characters.includes(draggedItem.id)) {
            newPathway.characters.push(draggedItem.id);
          }
          break;
      }

      setPathway(newPathway);
      onPathwayChange(newPathway);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Selection Panel */}
        <div className="space-y-4">
          <TagSelectionPanel tags={fandomData.tags} />
          <PlotBlockSelectionPanel plotBlocks={fandomData.plotBlocks} />
          <CharacterSelectionPanel characters={fandomData.characters} />
        </div>

        {/* Pathway Builder */}
        <PathwayDropZone pathway={pathway} onRemove={(type, id) => {
          const newPathway = { ...pathway };
          newPathway[type] = newPathway[type].filter(item => item !== id);
          setPathway(newPathway);
          onPathwayChange(newPathway);
        }} />

        {/* Results Panel */}
        <ResultsPanel pathway={pathway} fandomId={fandomData.id} />
      </div>
    </DndContext>
  );
}

function DraggableTag({ tag }: { tag: Tag }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tag-${tag.id}`,
    data: { type: 'tag', id: tag.id, name: tag.name }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-blue-100 hover:bg-blue-200 px-3 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors"
    >
      {tag.name}
    </div>
  );
}

function PathwayDropZone({ pathway, onRemove }: {
  pathway: PathwayConfig;
  onRemove: (type: keyof PathwayConfig, id: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'pathway-builder'
  });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-96 p-4 border-2 border-dashed rounded-lg transition-colors ${
        isOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      <h3 className="font-semibold mb-4">Your Story Pathway</h3>

      <div className="space-y-4">
        {pathway.tags.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tags</h4>
            <div className="flex flex-wrap gap-2">
              {pathway.tags.map(tagId => (
                <PathwayItem
                  key={tagId}
                  id={tagId}
                  type="tags"
                  onRemove={() => onRemove('tags', tagId)}
                />
              ))}
            </div>
          </div>
        )}

        {pathway.plotBlocks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Plot Blocks</h4>
            <div className="flex flex-wrap gap-2">
              {pathway.plotBlocks.map(blockId => (
                <PathwayItem
                  key={blockId}
                  id={blockId}
                  type="plotBlocks"
                  onRemove={() => onRemove('plotBlocks', blockId)}
                />
              ))}
            </div>
          </div>
        )}

        {pathway.tags.length === 0 && pathway.plotBlocks.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Drag tags and plot blocks here to build your story pathway
          </div>
        )}
      </div>
    </div>
  );
}
```

### Mobile Touch Interface

```typescript
import { useState, useRef } from 'react';

interface MobilePathwayBuilderProps {
  fandomData: FandomData;
  onPathwayChange: (pathway: PathwayConfig) => void;
}

function MobilePathwayBuilder({ fandomData, onPathwayChange }: MobilePathwayBuilderProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'plotBlocks' | 'pathway'>('tags');
  const [pathway, setPathway] = useState<PathwayConfig>({
    tags: [],
    plotBlocks: [],
    characters: []
  });

  const addToPathway = (type: keyof PathwayConfig, id: string) => {
    const newPathway = { ...pathway };
    if (!newPathway[type].includes(id)) {
      newPathway[type].push(id);
      setPathway(newPathway);
      onPathwayChange(newPathway);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
  };

  const removeFromPathway = (type: keyof PathwayConfig, id: string) => {
    const newPathway = { ...pathway };
    newPathway[type] = newPathway[type].filter(item => item !== id);
    setPathway(newPathway);
    onPathwayChange(newPathway);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Tab Navigation */}
      <div className="flex border-b bg-white sticky top-0 z-10">
        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'tags'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('tags')}
        >
          Tags
          {pathway.tags.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
              {pathway.tags.length}
            </span>
          )}
        </button>

        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'plotBlocks'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('plotBlocks')}
        >
          Plot Blocks
          {pathway.plotBlocks.length > 0 && (
            <span className="ml-1 bg-blue-100 text-blue-800 text-xs rounded-full px-2 py-1">
              {pathway.plotBlocks.length}
            </span>
          )}
        </button>

        <button
          className={`flex-1 py-3 px-4 text-center ${
            activeTab === 'pathway'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('pathway')}
        >
          Pathway
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'tags' && (
          <TagSelectionMobile
            tags={fandomData.tags}
            selectedTags={pathway.tags}
            onToggleTag={(tagId) => {
              if (pathway.tags.includes(tagId)) {
                removeFromPathway('tags', tagId);
              } else {
                addToPathway('tags', tagId);
              }
            }}
          />
        )}

        {activeTab === 'plotBlocks' && (
          <PlotBlockSelectionMobile
            plotBlocks={fandomData.plotBlocks}
            selectedBlocks={pathway.plotBlocks}
            onToggleBlock={(blockId) => {
              if (pathway.plotBlocks.includes(blockId)) {
                removeFromPathway('plotBlocks', blockId);
              } else {
                addToPathway('plotBlocks', blockId);
              }
            }}
          />
        )}

        {activeTab === 'pathway' && (
          <PathwayViewMobile
            pathway={pathway}
            fandomData={fandomData}
            onRemove={removeFromPathway}
          />
        )}
      </div>

      {/* Floating Action Button */}
      {(pathway.tags.length > 0 || pathway.plotBlocks.length > 0) && (
        <div className="fixed bottom-4 right-4">
          <button
            className="bg-blue-600 text-white p-4 rounded-full shadow-lg"
            onClick={() => setActiveTab('pathway')}
          >
            <span className="sr-only">View Pathway</span>
            🎯
          </button>
        </div>
      )}
    </div>
  );
}

function TagSelectionMobile({ tags, selectedTags, onToggleTag }: {
  tags: Tag[];
  selectedTags: string[];
  onToggleTag: (tagId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tag.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4">
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-3 border rounded-lg text-lg"
        />
      </div>

      {/* Tag Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredTags.map(tag => (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className={`p-4 rounded-lg text-left transition-colors ${
              selectedTags.includes(tag.id)
                ? 'bg-blue-100 border-2 border-blue-500'
                : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
            }`}
          >
            <div className="font-medium">{tag.name}</div>
            {tag.description && (
              <div className="text-sm text-gray-600 mt-1">{tag.description}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
```

## Testing Integration

### Component Testing Example

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { PathwayBuilder } from '../PathwayBuilder';

// Mock API calls
const mockSearchStories = vi.fn();
vi.mock('../api/stories', () => ({
  searchStories: mockSearchStories
}));

describe('PathwayBuilder Integration', () => {
  const mockFandomData = {
    id: 'harry-potter',
    name: 'Harry Potter',
    tags: [
      { id: 'angst', name: 'Angst', category: 'tone' },
      { id: 'time-travel', name: 'Time Travel', category: 'plot-device' }
    ],
    plotBlocks: [
      { id: 'goblin-inheritance', name: 'Goblin Inheritance' }
    ]
  };

  beforeEach(() => {
    mockSearchStories.mockClear();
  });

  it('should trigger search when pathway changes', async () => {
    mockSearchStories.mockResolvedValue({
      stories: [],
      pagination: { total: 0 }
    });

    render(
      <PathwayBuilder
        fandomData={mockFandomData}
        onPathwayChange={() => {}}
      />
    );

    // Select a tag
    fireEvent.click(screen.getByText('Angst'));

    // Wait for search to be triggered
    await waitFor(() => {
      expect(mockSearchStories).toHaveBeenCalledWith(
        'harry-potter',
        expect.objectContaining({
          tags: ['angst']
        })
      );
    });
  });

  it('should handle drag and drop interactions', async () => {
    const onPathwayChange = vi.fn();

    render(
      <PathwayBuilder
        fandomData={mockFandomData}
        onPathwayChange={onPathwayChange}
      />
    );

    // Simulate drag and drop
    const tagElement = screen.getByText('Angst');
    const dropZone = screen.getByTestId('pathway-drop-zone');

    // Note: This would require more complex drag-and-drop simulation
    // For actual implementation, consider using @testing-library/user-event
    fireEvent.dragStart(tagElement);
    fireEvent.dragOver(dropZone);
    fireEvent.drop(dropZone);

    expect(onPathwayChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: ['angst']
      })
    );
  });
});
```

### API Integration Testing

```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { searchStories } from '../api/stories';

const server = setupServer(
  rest.post('/api/stories/search', (req, res, ctx) => {
    const { fandomId, pathway } = req.body;

    // Mock response based on pathway
    const mockStories = pathway.tags.includes('angst') ? [
      {
        id: 'story-1',
        title: 'Angsty Story',
        author: 'Author Name',
        matchScore: 0.95
      }
    ] : [];

    return res(
      ctx.json({
        stories: mockStories,
        pagination: { total: mockStories.length }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('API Integration', () => {
  it('should search stories with correct parameters', async () => {
    const results = await searchStories('harry-potter', {
      tags: ['angst'],
      plotBlocks: [],
      characters: []
    });

    expect(results.stories).toHaveLength(1);
    expect(results.stories[0].title).toBe('Angsty Story');
  });
});
```

---

*These examples demonstrate real-world integration patterns. Adapt them to your specific use case and requirements.*
