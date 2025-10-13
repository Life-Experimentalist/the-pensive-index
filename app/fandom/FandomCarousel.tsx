'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FandomCarouselProps {
  fandoms: Array<{
    id: number;
    name: string;
    slug: string;
    description: string;
    metadata: unknown;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

/**
 * Client Component for Fandom Carousel
 * Interactive carousel to browse featured fandoms
 */
export default function FandomCarousel({ fandoms }: FandomCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  const totalPages = Math.ceil(fandoms.length / itemsPerPage);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalPages - 1;

  const handlePrevious = () => {
    if (canGoPrevious) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const visibleFandoms = fandoms.slice(
    currentIndex * itemsPerPage,
    (currentIndex + 1) * itemsPerPage
  );

  if (fandoms.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <div className="overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleFandoms.map(fandom => (
            <Link
              key={fandom.id}
              href={`/fandom/${fandom.slug}`}
              className="bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              <h3 className="text-2xl font-bold mb-2">{fandom.name}</h3>
              <p className="text-white text-opacity-90 text-sm mb-4 line-clamp-2">
                {fandom.description || 'Explore this fandom'}
              </p>
              <div className="flex items-center justify-end text-sm">
                <span className="text-white text-opacity-75">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious}
            className={`p-2 rounded-full border-2 transition-all ${
              canGoPrevious
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Previous fandoms"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentIndex
                    ? 'bg-blue-600 dark:bg-blue-400 w-8'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`p-2 rounded-full border-2 transition-all ${
              canGoNext
                ? 'border-blue-600 dark:border-blue-400 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
            aria-label="Next fandoms"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
