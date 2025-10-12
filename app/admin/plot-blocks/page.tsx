'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
} from '@heroicons/react/24/outline';

interface PlotBlock {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fandom_id: string;
  fandom_name?: string;
  category: string | null;
  parent_id: string | null;
  parent_name?: string | null;
  tag_combination: string[];
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  fandom_id: string;
}

interface Fandom {
  id: number;
  name: string;
  slug: string;
}

interface PlotBlockFormData {
  name: string;
  slug: string;
  description: string;
  fandom_id: string;
  category: string;
  parent_id: string;
  tag_combination: string[];
  is_active: boolean;
}

export default function PlotBlocksAdminPage() {
  const { userId } = useAuth();
  const [plotBlocks, setPlotBlocks] = useState<PlotBlock[]>([]);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [parentBlocks, setParentBlocks] = useState<PlotBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<PlotBlock | null>(null);
  const [formData, setFormData] = useState<PlotBlockFormData>({
    name: '',
    slug: '',
    description: '',
    fandom_id: '',
    category: '',
    parent_id: '',
    tag_combination: [],
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFandom, setSelectedFandom] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<
    'all' | 'active' | 'inactive'
  >('all');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.fandom_id) {
      fetchTags(formData.fandom_id);
      fetchParentBlocks(formData.fandom_id);
    }
  }, [formData.fandom_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [blocksRes, fandomsRes] = await Promise.all([
        fetch('/api/admin/plot-blocks'),
        fetch('/api/admin/fandom'),
      ]);

      if (!blocksRes.ok || !fandomsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const blocksData = await blocksRes.json();
      const fandomsData = await fandomsRes.json();

      setPlotBlocks(blocksData.plotBlocks || []);
      setFandoms(fandomsData.fandoms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async (fandomId: string) => {
    try {
      const response = await fetch(`/api/admin/tags?fandom=${fandomId}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setAvailableTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const fetchParentBlocks = async (fandomId: string) => {
    try {
      const response = await fetch(
        `/api/admin/plot-blocks?fandom=${fandomId}&parent_only=true`
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setParentBlocks(data.plotBlocks || []);
    } catch (err) {
      console.error('Failed to fetch parent blocks:', err);
    }
  };

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: editingBlock ? formData.slug : generateSlug(name),
    });
  };

  const toggleTagInCombination = (tagId: string) => {
    const current = formData.tag_combination;
    const updated = current.includes(tagId)
      ? current.filter(id => id !== tagId)
      : [...current, tagId];
    setFormData({ ...formData, tag_combination: updated });
  };

  const openCreateModal = () => {
    setEditingBlock(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      fandom_id: selectedFandom !== 'all' ? selectedFandom : '',
      category: '',
      parent_id: '',
      tag_combination: [],
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (block: PlotBlock) => {
    setEditingBlock(block);
    setFormData({
      name: block.name,
      slug: block.slug,
      description: block.description || '',
      fandom_id: block.fandom_id,
      category: block.category || '',
      parent_id: block.parent_id || '',
      tag_combination: block.tag_combination || [],
      is_active: block.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fandom_id) {
      setError('Please select a fandom');
      return;
    }

    if (formData.tag_combination.length === 0) {
      setError('Please select at least one tag for the plot block');
      return;
    }

    try {
      const url = editingBlock
        ? `/api/admin/plot-blocks/${editingBlock.id}`
        : '/api/admin/plot-blocks';

      const method = editingBlock ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parent_id: formData.parent_id || null,
          category: formData.category || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save plot block');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (blockId: string, blockName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${blockName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/plot-blocks/${blockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete plot block');
      }

      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredBlocks = plotBlocks.filter(block => {
    const matchesSearch =
      block.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      block.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFandom =
      selectedFandom === 'all' || block.fandom_id === selectedFandom;
    const matchesCategory =
      selectedCategory === 'all' || block.category === selectedCategory;
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && block.is_active) ||
      (filterActive === 'inactive' && !block.is_active);
    return matchesSearch && matchesFandom && matchesCategory && matchesFilter;
  });

  const categories = Array.from(
    new Set(plotBlocks.map(b => b.category).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading plot blocks...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Plot Block Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage plot blocks (tropes) as customizable tag combinations. Example:
          "Earlier Emancipation" = a set of specific tags.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-600 dark:text-red-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search plot blocks..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
            />
          </div>

          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors whitespace-nowrap"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Plot Block</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={selectedFandom}
            onChange={e => setSelectedFandom(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Fandoms</option>
            {fandoms.map(fandom => (
              <option key={fandom.id} value={String(fandom.id)}>
                {fandom.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category || 'uncategorized'} value={category || ''}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={filterActive}
            onChange={e =>
              setFilterActive(e.target.value as 'all' | 'active' | 'inactive')
            }
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Plot Blocks Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Plot Block
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fandom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tags
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBlocks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ||
                    selectedFandom !== 'all' ||
                    selectedCategory !== 'all'
                      ? 'No plot blocks match your filters'
                      : 'No plot blocks yet. Create your first plot block to get started!'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredBlocks.map(block => (
                <tr
                  key={block.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {block.name}
                        {block.parent_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            (child of {block.parent_name})
                          </span>
                        )}
                      </div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                        {block.slug}
                      </code>
                      {block.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">
                          {block.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {block.fandom_name || block.fandom_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <TagIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {block.tag_combination?.length || 0}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        tags
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {block.category && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {block.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        block.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {block.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(block)}
                        className="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(block.id, block.name)}
                        className="p-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingBlock ? 'Edit Plot Block' : 'Create New Plot Block'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Fandom */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fandom *
                  </label>
                  <select
                    required
                    value={formData.fandom_id}
                    onChange={e =>
                      setFormData({ ...formData, fandom_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="">Select a fandom</option>
                    {fandoms.map(fandom => (
                      <option key={fandom.id} value={String(fandom.id)}>
                        {fandom.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => handleNameChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                    placeholder="Earlier Emancipation"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={e =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white font-mono"
                    placeholder="earlier-emancipation"
                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    URL-friendly identifier (lowercase, hyphens only)
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={e =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                    placeholder="Harry gains emancipation earlier than canon, leading to..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={e =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                      placeholder="Emancipation"
                    />
                  </div>

                  {/* Parent Block */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Parent Block (Optional)
                    </label>
                    <select
                      value={formData.parent_id}
                      onChange={e =>
                        setFormData({ ...formData, parent_id: e.target.value })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                      disabled={!formData.fandom_id}
                    >
                      <option value="">None (Top-level block)</option>
                      {parentBlocks
                        .filter(b => b.id !== editingBlock?.id)
                        .map(block => (
                          <option key={block.id} value={block.id}>
                            {block.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Tag Combination */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Tag Combination * ({formData.tag_combination.length}{' '}
                    selected)
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {!formData.fandom_id ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Please select a fandom first
                      </p>
                    ) : availableTags.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No tags available for this fandom
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableTags.map(tag => (
                          <label
                            key={tag.id}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={formData.tag_combination.includes(
                                tag.id
                              )}
                              onChange={() => toggleTagInCombination(tag.id)}
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {tag.name}
                              </div>
                              <code className="text-xs text-gray-500 dark:text-gray-400">
                                {tag.slug}
                              </code>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Select tags that together define this plot block/trope
                  </p>
                </div>

                {/* Is Active */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_active"
                    className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active (visible to users)
                  </label>
                </div>

                {/* Actions */}
                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                  >
                    {editingBlock ? 'Save Changes' : 'Create Plot Block'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
