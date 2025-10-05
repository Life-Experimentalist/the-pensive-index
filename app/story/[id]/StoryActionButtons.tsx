'use client';

import { Share2, Bookmark } from 'lucide-react';

/**
 * Client Component for Story Action Buttons
 * Handles Share and Bookmark interactions
 */
export default function StoryActionButtons() {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleBookmark = () => {
    // Implement bookmark functionality
    // This would typically save to user's profile or local storage
    alert('Bookmark feature coming soon!');
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        onClick={handleShare}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>
      <button
        onClick={handleBookmark}
        className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <Bookmark className="w-4 h-4" />
        <span>Save</span>
      </button>
    </div>
  );
}
