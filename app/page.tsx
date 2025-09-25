/**
 * Home Page - The Pensieve Index
 *
 * Landing page for the story discovery platform
 *
 * @package the-pensive-index
 * @version 1.0.0
 */

import UserNavigation from '@/components/HomePage/UserNavigation';
import UserContent from '@/components/HomePage/UserContent';
import Image from 'next/image';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Image
                src="/icon.png"
                alt="The Pensieve Index"
                width={32}
                height={32}
                className="w-8 h-8"
              />
              <h1 className="text-xl font-bold text-gray-900">
                The Pensieve Index
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <UserNavigation />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          {/* Logo Banner */}
          <div className="mb-8">
            <Image
              src="/logo banner.png"
              alt="The Pensieve Index - Logo Banner"
              width={600}
              height={200}
              className="mx-auto max-w-full h-auto"
              priority
            />
          </div>

          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            Welcome to{' '}
            <span className="text-indigo-600">The Pensieve Index</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            A library-first story discovery platform and intelligent prompt
            generator for fanfiction.
          </p>

          <UserContent />

          {/* Hero Image */}
          <div className="mt-12">
            <Image
              src="/hero.png"
              alt="The Pensieve Index - Hero Image"
              width={800}
              height={400}
              className="mx-auto max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
        </div>

        {/* Features */}
        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Story Discovery
              </h3>
              <p className="text-gray-600">
                Find existing tagged stories with advanced search and relevance
                scoring.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Prompt Generation
              </h3>
              <p className="text-gray-600">
                Generate intelligent story prompts with novelty highlights for
                new content.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Admin Dashboard
              </h3>
              <p className="text-gray-600">
                Manage validation rules, tag classes, and content through the
                admin interface.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
