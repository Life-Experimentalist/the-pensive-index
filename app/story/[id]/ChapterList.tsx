'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';

interface Chapter {
  id: string;
  title: string;
  wordCount: number;
  publishedAt: string;
  summary?: string;
}

interface ChapterListProps {
  chapters: Chapter[];
}

/**
 * Client Component for Chapter List
 * Handles expanding/collapsing chapter list
 */
export default function ChapterList({ chapters }: ChapterListProps) {
  const [showAll, setShowAll] = useState(false);
  const displayChapters = showAll ? chapters : chapters.slice(0, 5);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">
          Chapters ({chapters.length})
        </h3>
      </div>
      <div className="divide-y">
        {displayChapters.map((chapter, index) => (
          <div key={chapter.id} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-500">
                    #{index + 1}
                  </span>
                  <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                  <span>{chapter.wordCount.toLocaleString()} words</span>
                  <span>
                    {new Date(chapter.publishedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}
        {chapters.length > 5 && (
          <div className="p-4 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {showAll ? 'Show less' : `Show all ${chapters.length} chapters`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
