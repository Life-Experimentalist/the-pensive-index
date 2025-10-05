'use client';

/**
 * Client Component for Share Button
 * Handles page sharing via Web Share API or clipboard fallback
 */
export default function FandomShareButton({
  fandomName,
}: {
  fandomName: string;
}) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${fandomName} Story Discovery`,
          text: `Discover ${fandomName} fanfiction stories`,
          url: window.location.href,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled', err);
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
      title="Share this page"
      aria-label="Share this fandom page"
    >
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
      </svg>
    </button>
  );
}
