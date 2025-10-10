'use client';

import Link from 'next/link';
import Image from 'next/image';
import ClientThemeToggle from '@/components/theme/ClientThemeToggle';
import UserNavigation from '@/components/HomePage/UserNavigation';

export default function PageHeader() {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm fixed w-full top-0 z-50 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <Image
              src="/icon.png"
              alt="The Pensieve Index"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              The Pensieve Index
            </h1>
          </Link>
          <div className="flex items-center space-x-4">
            <Link
              href="/fandom"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Fandoms
            </Link>
            <Link
              href="/pathway"
              className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Pathways
            </Link>
            <ClientThemeToggle />
            <UserNavigation />
          </div>
        </div>
      </div>
    </header>
  );
}
