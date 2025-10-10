'use client';

import { useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { PathwayBuilder } from './PathwayBuilder';
import { PathwayBuilderMobile } from './PathwayBuilderMobile';
import type { Tag, PlotBlock, TagClass } from '@/types';

interface PathwayBuilderWrapperProps {
  fandomId: string;
}

export default function PathwayBuilderWrapper({
  fandomId,
}: PathwayBuilderWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [plotBlocks, setPlotBlocks] = useState<PlotBlock[]>([]);
  const [tagClasses, setTagClasses] = useState<TagClass[]>([]);

  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    async function loadPathwayData() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/fandoms/${fandomId}/pathway-data`);

        if (!response.ok) {
          throw new Error(
            `Failed to load pathway data: ${response.statusText}`
          );
        }

        const data = await response.json();

        setTags(data.tags || []);
        setPlotBlocks(data.plotBlocks || []);
        setTagClasses(data.tagClasses || []);
      } catch (err) {
        console.error('Error loading pathway data:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to load pathway data'
        );
      } finally {
        setLoading(false);
      }
    }

    if (fandomId) {
      loadPathwayData();
    }
  }, [fandomId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading pathway builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-red-950/50 border border-red-800 rounded-lg p-6 max-w-md">
          <h3 className="text-red-400 font-semibold mb-2">
            Error Loading Data
          </h3>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-md text-sm transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (tags.length === 0 && plotBlocks.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 max-w-md text-center">
          <p className="text-slate-300">
            No pathway elements available for this fandom yet.
          </p>
          <p className="text-slate-400 text-sm mt-2">Check back soon!</p>
        </div>
      </div>
    );
  }

  // Render mobile or desktop version based on screen size
  return isMobile ? (
    <PathwayBuilderMobile
      fandomId={fandomId}
      availableTags={tags}
      availablePlotBlocks={plotBlocks}
      tagClasses={tagClasses}
    />
  ) : (
    <PathwayBuilder
      fandomId={fandomId}
      availableTags={tags}
      availablePlotBlocks={plotBlocks}
      tagClasses={tagClasses}
    />
  );
}
