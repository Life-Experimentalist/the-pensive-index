'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import LoadingPage from '@/app/loading';
import PageHeader from '@/components/ui/PageHeader';
import PageFooter from '@/components/ui/PageFooter';

interface Tag {
  id: string;
  name: string;
  category?: string;
}

interface Trope {
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
  const [tropes, setTropes] = useState<Trope[]>([]);

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTropes, setSelectedTropes] = useState<string[]>([]);

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
          console.log('[Pathway] Loaded fandoms:', data.fandoms);
          setFandoms(data.fandoms || []);
        } else {
          console.error('[Pathway] Failed to load fandoms:', await res.text());
        }
      } catch (error) {
        console.error('Error loading fandoms:', error);
      }
    };
    loadFandoms();
  }, []);

  // Load tags and tropes when fandom is selected
  useEffect(() => {
    if (!selectedFandom) {
      return;
    }

    const loadFandomData = async () => {
      try {
        console.log('[Pathway] Loading data for fandom:', selectedFandom);

        const [tagsRes, tropesRes] = await Promise.all([
          fetch(`/api/fandoms/${selectedFandom}/tags`),
          fetch(`/api/fandoms/${selectedFandom}/tropes`),
        ]);

        console.log('[Pathway] API responses:', {
          tagsStatus: tagsRes.status,
          tropesStatus: tropesRes.status,
        });

        if (tagsRes.ok) {
          const tagsData = await tagsRes.json();
          console.log('[Pathway] Tags data:', tagsData);
          setTags(tagsData.tags || []);
        } else {
          console.error('[Pathway] Tags fetch failed:', await tagsRes.text());
        }

        if (tropesRes.ok) {
          const tropesData = await tropesRes.json();
          console.log('[Pathway] Tropes data:', tropesData);
          setTropes(tropesData.tropes || []);
        } else {
          console.error(
            '[Pathway] Tropes fetch failed:',
            await tropesRes.text()
          );
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
      (selectedTags.length === 0 && selectedTropes.length === 0)
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
            tropes: selectedTropes,
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
  }, [selectedFandom, selectedTags, selectedTropes]);

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
          tags: selectedTags,
          plotBlocks: selectedTropes,
          isPublic,
          isPersisted: true, // Save to database permanently
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

  const toggleTrope = (tropeId: string) => {
    setSelectedTropes(prev =>
      prev.includes(tropeId)
        ? prev.filter(id => id !== tropeId)
        : [...prev, tropeId]
    );
  };

  if (!isLoaded) {
    return <LoadingPage />;
  }

  return (
    <>
      <PageHeader />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-indigo-900/20 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
              Story Pathway Builder
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Craft your perfect story pathway by combining tags and tropes.
              Discover matching stories or generate a creative prompt for new
              ones.
            </p>
          </div>

          {/* Fandom Selection Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-100 dark:border-purple-900/30 p-8 mb-8 hover:shadow-xl transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <label className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Your Fandom
              </label>
            </div>
            <select
              value={selectedFandom}
              onChange={e => setSelectedFandom(e.target.value)}
              className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg transition-all hover:border-purple-300 dark:hover:border-purple-600"
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
              {/* Pathway Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900/30 p-8 mb-8 hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Pathway Details
                  </h2>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Pathway Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={pathwayName}
                      onChange={e => setPathwayName(e.target.value)}
                      placeholder="e.g., Time Travel Harry Potter Stories"
                      className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all hover:border-indigo-300 dark:hover:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Description{' '}
                      <span className="text-gray-400 text-xs">(Optional)</span>
                    </label>
                    <textarea
                      value={pathwayDescription}
                      onChange={e => setPathwayDescription(e.target.value)}
                      placeholder="Describe your pathway..."
                      rows={3}
                      className="w-full px-5 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all hover:border-indigo-300 dark:hover:border-indigo-600"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    <input
                      type="checkbox"
                      id="isPublic"
                      checked={isPublic}
                      onChange={e => setIsPublic(e.target.checked)}
                      className="w-5 h-5 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500"
                    />
                    <label
                      htmlFor="isPublic"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                    >
                      📢 Make this pathway public (others can view and use it)
                    </label>
                  </div>
                </div>
              </div>

              {/* Selection Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Tags Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-purple-100 dark:border-purple-900/30 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Tags
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-semibold">
                      {selectedTags.length} selected
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {tags.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                          No tags available for this fandom
                        </p>
                      </div>
                    ) : (
                      tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-[1.02] ${
                            selectedTags.includes(tag.id)
                              ? 'bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border-2 border-purple-400 dark:border-purple-500 text-purple-900 dark:text-purple-100 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="font-semibold">{tag.name}</div>
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

                {/* Tropes Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-indigo-100 dark:border-indigo-900/30 p-6 hover:shadow-xl transition-shadow">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        Tropes
                      </h3>
                    </div>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-semibold">
                      {selectedTropes.length} selected
                    </span>
                  </div>
                  <div className="max-h-96 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {tropes.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg
                            className="w-8 h-8 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                            />
                          </svg>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">
                          No tropes available for this fandom
                        </p>
                      </div>
                    ) : (
                      tropes.map(trope => (
                        <button
                          key={trope.id}
                          onClick={() => toggleTrope(trope.id)}
                          className={`w-full text-left px-4 py-3 rounded-lg transition-all transform hover:scale-[1.02] ${
                            selectedTropes.includes(trope.id)
                              ? 'bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/40 dark:to-purple-900/40 border-2 border-indigo-400 dark:border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-md'
                              : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                          }`}
                        >
                          <div className="font-semibold">{trope.name}</div>
                          {trope.description && (
                            <div className="text-xs opacity-75 mt-1 line-clamp-2">
                              {trope.description}
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Results Preview */}
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-xl p-8 mb-8 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                      />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Discovery Results</h3>
                </div>
                <div className="text-center py-6">
                  <div className="text-7xl font-extrabold mb-3 drop-shadow-lg">
                    {matchingStories}
                  </div>
                  <p className="text-xl font-medium text-white/90">
                    {matchingStories === 1 ? 'story matches' : 'stories match'}{' '}
                    your pathway
                  </p>
                  <p className="text-sm text-white/70 mt-2">
                    {selectedTags.length + selectedTropes.length} criteria
                    selected
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-end">
                <button
                  onClick={() => router.push('/')}
                  className="px-8 py-4 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all font-semibold hover:shadow-lg transform hover:scale-105"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSavePathway}
                  disabled={isSaving || !pathwayName.trim()}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-700 text-white rounded-xl transition-all font-semibold disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Pathway'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 3px;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>
      </div>
      <PageFooter />
    </>
  );
}
