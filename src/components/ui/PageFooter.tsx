import Link from 'next/link';

export default function PageFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 dark:text-gray-400 py-12 border-t border-gray-800 dark:border-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white dark:text-gray-100 font-bold text-lg mb-4">
              The Pensieve Index
            </h3>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              A library-first story discovery platform and intelligent prompt
              generator for fanfiction.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">
              Navigate
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  href="/fandom"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Browse Fandoms
                </Link>
              </li>
              <li>
                <Link
                  href="/pathway"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Story Pathways
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">
              Community
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://github.com/Life-Experimentalists/the-pensive-index"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  GitHub Repository
                </a>
              </li>
              <li>
                <Link
                  href="/about"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="/contribute"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Contribute
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white dark:text-gray-100 font-semibold mb-4">
              Legal
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/dmca"
                  className="hover:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                >
                  DMCA Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-gray-800 dark:border-gray-900 mt-8 pt-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-600">
            © {currentYear} The Pensieve Index. All rights reserved.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-700 mt-2">
            Built with ❤️ for the fanfiction community
          </p>
        </div>
      </div>
    </footer>
  );
}
