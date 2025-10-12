'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  fandom_id: string;
  fandom_name?: string;
  tag_class_id: string | null;
  tag_class_name?: string | null;
  parent_id: string | null;
  parent_name?: string | null;
  category: string | null;
  is_active: boolean;
  created_at: number;
  updated_at: number;
}

interface Fandom {
  id: number;
  name: string;
  slug: string;
}

interface TagClass {
  id: string;
  name: string;
  fandom_id: string;
}

interface TagFormData {
  name: string;
  slug: string;
  description: string;
  fandom_id: string;
  tag_class_id: string;
  parent_id: string;
  category: string;
  is_active: boolean;
}

export default function TagsAdminPage() {
  const { userId } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [fandoms, setFandoms] = useState<Fandom[]>([]);
  const [tagClasses, setTagClasses] = useState<TagClass[]>([]);
  const [parentTags, setParentTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState<TagFormData>({
    name: '',
    slug: '',
    description: '',
    fandom_id: '',
    tag_class_id: '',
    parent_id: '',
    category: '',
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
      fetchTagClasses(formData.fandom_id);
      fetchParentTags(formData.fandom_id);
    }
  }, [formData.fandom_id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tagsRes, fandomsRes] = await Promise.all([
        fetch('/api/admin/tags'),
        fetch('/api/admin/fandom'),
      ]);

      if (!tagsRes.ok || !fandomsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const tagsData = await tagsRes.json();
      const fandomsData = await fandomsRes.json();

      setTags(tagsData.tags || []);
      setFandoms(fandomsData.fandoms || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchTagClasses = async (fandomId: string) => {
    try {
      const response = await fetch(`/api/admin/tag-classes?fandom=${fandomId}`);
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setTagClasses(data.tagClasses || []);
    } catch (err) {
      console.error('Failed to fetch tag classes:', err);
    }
  };

  const fetchParentTags = async (fandomId: string) => {
    try {
      const response = await fetch(
        `/api/admin/tags?fandom=${fandomId}&parent_only=true`
      );
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      setParentTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch parent tags:', err);
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
      slug: editingTag ? formData.slug : generateSlug(name),
    });
  };

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      fandom_id: selectedFandom !== 'all' ? selectedFandom : '',
      tag_class_id: '',
      parent_id: '',
      category: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      slug: tag.slug,
      description: tag.description || '',
      fandom_id: tag.fandom_id,
      tag_class_id: tag.tag_class_id || '',
      parent_id: tag.parent_id || '',
      category: tag.category || '',
      is_active: tag.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fandom_id) {
      setError('Please select a fandom');
      return;
    }

    try {
      const url = editingTag
        ? `/api/admin/tags/${editingTag.id}`
        : '/api/admin/tags';

      const method = editingTag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tag_class_id: formData.tag_class_id || null,
          parent_id: formData.parent_id || null,
          category: formData.category || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save tag');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (tagId: string, tagName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${tagName}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tags/${tagId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete tag');
      }

      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const filteredTags = tags.filter(tag => {
    const matchesSearch =
      tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tag.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFandom =
      selectedFandom === 'all' || tag.fandom_id === selectedFandom;
    const matchesCategory =
      selectedCategory === 'all' || tag.category === selectedCategory;
    const matchesFilter =
      filterActive === 'all' ||
      (filterActive === 'active' && tag.is_active) ||
      (filterActive === 'inactive' && !tag.is_active);
    return matchesSearch && matchesFandom && matchesCategory && matchesFilter;
  });

  const categories = Array.from(
    new Set(tags.map(t => t.category).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            Loading tags...
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
          Tag Management
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage tags across all fandoms. Project Admins can edit all tags,
          Fandom Admins can edit only their assigned fandoms.
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
              placeholder="Search tags..."
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
            <span>New Tag</span>
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

      {/* Tags Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Fandom
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Tag Class
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
            {filteredTags.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ||
                    selectedFandom !== 'all' ||
                    selectedCategory !== 'all'
                      ? 'No tags match your filters'
                      : 'No tags yet. Create your first tag to get started!'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredTags.map(tag => (
                <tr
                  key={tag.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {tag.name}
                        {tag.parent_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            (child of {tag.parent_name})
                          </span>
                        )}
                      </div>
                      <code className="text-xs bg-gray-100 dark:bg-gray-900 px-2 py-0.5 rounded">
                        {tag.slug}
                      </code>
                      {tag.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-md">
                          {tag.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {tag.fandom_name || tag.fandom_id}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {tag.category && (
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {tag.category}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {tag.tag_class_name || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tag.is_active
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}
                    >
                      {tag.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(tag)}
                        className="p-2 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(tag.id, tag.name)}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                {editingTag ? 'Edit Tag' : 'Create New Tag'}
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
                    placeholder="Harry/Hermione"
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
                    placeholder="harry-hermione"
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
                    placeholder="Harry and Hermione romantic pairing"
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
                      placeholder="Shipping"
                    />
                  </div>

                  {/* Tag Class */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Tag Class
                    </label>
                    <select
                      value={formData.tag_class_id}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          tag_class_id: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                      disabled={!formData.fandom_id}
                    >
                      <option value="">None</option>
                      {tagClasses.map(tc => (
                        <option key={tc.id} value={tc.id}>
                          {tc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Parent Tag */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Parent Tag (Optional)
                  </label>
                  <select
                    value={formData.parent_id}
                    onChange={e =>
                      setFormData({ ...formData, parent_id: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900 dark:text-white"
                    disabled={!formData.fandom_id}
                  >
                    <option value="">None (Top-level tag)</option>
                    {parentTags
                      .filter(t => t.id !== editingTag?.id)
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    For hierarchical tags (e.g., "Goblin Inheritance" → "Black
                    Lordship")
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
                    {editingTag ? 'Save Changes' : 'Create Tag'}
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
