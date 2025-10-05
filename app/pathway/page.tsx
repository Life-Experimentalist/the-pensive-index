'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

interface Tag {
  id: string;
  name: string;
  category?: string;
}

interface PlotBlock {
  id: string;
  name: string;
  description?: string;
}

interface Fandom {
  id: string;
  name: string;
  slug: string;
}

export default function PathwayBuilderPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();

  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [selectedFandom, setSelectedFandom] = useState<string>('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [plotBlocks, setPlotBlocks] = useState<PlotBlock[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedPlotBlocks, setSelectedPlotBlocks] = useState<string[]>([]);

  const [pathwayName, setPathwayName] = useState('');
  const [pathwayDescription, setPathwayDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [matchingStories, setMatchingStories] = useState<number>(0);

  // Load fandoms on mount
  useEffect(() => {
    const loadFandoms = async () => {
      try {
        const res = await fetch('/api/fandoms');
        if (res.ok) {
          const data = await res.json();
          setFandoms(data.fandoms || []);
        }
      } catch (error) {
        console.error('Error loading fandoms:', error);
      }
    };
    loadFandoms();
  }, []);

  // Load tags and plot blocks when fandom is selected
  useEffect(() => {
    if (!selectedFandom) return;

    const loadFandomData = async () => {
      try {
        const [tagsRes, blocksRes] = await Promise.all([
          fetch(`/api/fandoms/${selectedFandom}/tags`),
          fetch(`/api/fandoms/${selectedFandom}/plot-blocks`),
        ]);

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          setTags(tagsData.tags || []);
        }

        if (blocksRes.ok) {
          const blocksData = await blocksRes.json();
          setPlotBlocks(blocksData.plotBlocks || []);
        }
      } catch (error) {
        console.error('Error loading fandom data:', error);
      }
    };

    loadFandomData();
  }, [selectedFandom]);

  // Search for matching stories when selection changes
  useEffect(() => {
    if (
      !selectedFandom ||
      (selectedTags.length === 0 && selectedPlotBlocks.length === 0)
    ) {
      setMatchingStories(0);
      return;
    }

    const searchStories = async () => {
      try {
        const res = await fetch('/api/stories/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fandomId: selectedFandom,
            tags: selectedTags,
            plotBlocks: selectedPlotBlocks,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setMatchingStories(data.total || 0);
        }
      } catch (error) {
        console.error('Error searching stories:', error);
      }
    };

    const debounceTimer = setTimeout(searchStories, 500);
    return () => clearTimeout(debounceTimer);
  }, [selectedFandom, selectedTags, selectedPlotBlocks]);

  const handleSavePathway = async () => {
    if (!isSignedIn) {
      router.push('/sign-in?redirect=/pathway');
      return;
    }

    if (!pathwayName.trim() || !selectedFandom) {
      alert('Please provide a pathway name and select a fandom');
      return;
    }

    setIsSaving(true);

    try {
      const pathwayId = uuidv4();

      const res = await fetch('/api/pathways', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: pathwayId,
          userId: user?.id,
          fandomId: selectedFandom,
          name: pathwayName,
          description: pathwayDescription,
          selectedTags,
          selectedPlotBlocks,
          isPublic,
        }),
      });

      if (res.ok) {
        router.push(`/pathway/${pathwayId}`);
      } else {
        const error = await res.json();
        alert(`Error saving pathway: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving pathway:', error);
      alert('Failed to save pathway. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  const togglePlotBlock = (blockId: string) => {
    setSelectedPlotBlocks(prev =>
      prev.includes(blockId)
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Story Pathway Builder
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Build your perfect story pathway by selecting tags and plot blocks.
            Find matching stories or create a prompt for new ones.
          </p>
        </div>

        {/* Fandom Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Fandom
          </label>
          <select
            value={selectedFandom}
            onChange={e => setSelectedFandom(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Choose a fandom...</option>
            {fandoms.map(fandom => (
              <option key={fandom.id} value={fandom.id}>
                {fandom.name}
              </option>
            ))}
          </select>
        </div>

        {selectedFandom && (
          <>
            {/* Pathway Details */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Pathway Details
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pathway Name *
                  </label>
                  <input
                    type="text"
                    value={pathwayName}
                    onChange={e => setPathwayName(e.target.value)}
                    placeholder="e.g., Time Travel Harry Potter Stories"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={pathwayDescription}
                    onChange={e => setPathwayDescription(e.target.value)}
                    placeholder="Describe your pathway..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={isPublic}
                    onChange={e => setIsPublic(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                  />
                  <label
                    htmlFor="isPublic"
                    className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                  >
                    Make this pathway public (others can view and use it)
                  </label>
                </div>
              </div>
            </div>

            {/* Selection Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Tags Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Tags ({selectedTags.length} selected)
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {tags.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No tags available for this fandom
                    </p>
                  ) : (
                    tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedTags.includes(tag.id)
                            ? 'bg-indigo-100 dark:bg-indigo-900 border-2 border-indigo-500 text-indigo-900 dark:text-indigo-100'
                            : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="font-medium">{tag.name}</div>
                        {tag.category && (
                          <div className="text-xs opacity-75 mt-1">
                            {tag.category}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Plot Blocks Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Plot Blocks ({selectedPlotBlocks.length} selected)
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {plotBlocks.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No plot blocks available for this fandom
                    </p>
                  ) : (
                    plotBlocks.map(block => (
                      <button
                        key={block.id}
                        onClick={() => togglePlotBlock(block.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                          selectedPlotBlocks.includes(block.id)
                            ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-500 text-purple-900 dark:text-purple-100'
                            : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        <div className="font-medium">{block.name}</div>
                        {block.description && (
                          <div className="text-xs opacity-75 mt-1">
                            {block.description}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Results Preview */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                Matching Stories
              </h3>
              <div className="text-center">
                <div className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {matchingStories}
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {matchingStories === 1 ? 'story matches' : 'stories match'}{' '}
                  your pathway
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-end">
              <button
                onClick={() => router.push('/')}
                className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>

              <button
                onClick={handleSavePathway}
                disabled={isSaving || !pathwayName.trim()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Pathway'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
