import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  FileText, Plus, Edit, Trash2, Eye, Calendar, Clock, 
  Tag, Loader, CheckCircle, XCircle, TrendingUp, Sparkles,
  Link as LinkIcon, Play
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function BlogsPanel({ token }) {
  const [blogs, setBlogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: 'Getting Started',
    tags: [],
    image: '',
    status: 'draft',
    scheduled_time: '',
    generate_with_ai: false,
    ai_prompt: ''
  });

  useEffect(() => {
    fetchBlogs();
    fetchStats();
    fetchSchedulerStatus();
  }, [activeTab]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const statusFilter = activeTab === 'all' ? '' : `?status=${activeTab}`;
      const response = await axios.get(`${API_URL}/api/blogs/admin${statusFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBlogs(response.data.blogs || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast.error('Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/blogs/stats/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSchedulerStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/admin/blogs/scheduler-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSchedulerStatus(response.data);
    } catch (error) {
      console.error('Error fetching scheduler status:', error);
    }
  };

  const handleCreateNew = () => {
    setSelectedBlog(null);
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: 'Getting Started',
      tags: [],
      image: '',
      status: 'draft',
      scheduled_time: '',
      generate_with_ai: false,
      ai_prompt: ''
    });
    setShowEditor(true);
  };

  const handleEdit = (blog) => {
    setSelectedBlog(blog);
    setFormData({
      title: blog.title,
      excerpt: blog.excerpt,
      content: blog.content,
      category: blog.category,
      tags: blog.tags || [],
      image: blog.image || '',
      status: blog.status,
      scheduled_time: blog.scheduled_time ? new Date(blog.scheduled_time).toISOString().slice(0, 16) : '',
      generate_with_ai: false,
      ai_prompt: ''
    });
    setShowEditor(true);
  };

  const handleDelete = async (blogId) => {
    if (!window.confirm('Are you sure you want to delete this blog?')) return;

    try {
      await axios.delete(`${API_URL}/api/blogs/${blogId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Blog deleted successfully');
      fetchBlogs();
      fetchStats();
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast.error('Failed to delete blog');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      const data = {
        ...formData,
        tags: Array.isArray(formData.tags) ? formData.tags : formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        scheduled_time: formData.scheduled_time || null
      };

      if (selectedBlog) {
        // Update existing blog
        await axios.put(`${API_URL}/api/blogs/${selectedBlog.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Blog updated successfully');
      } else {
        // Create new blog
        await axios.post(`${API_URL}/api/blogs/`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Blog created successfully');
      }

      setShowEditor(false);
      fetchBlogs();
      fetchStats();
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error('Failed to save blog');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    try {
      setGenerating(true);
      const response = await axios.post(`${API_URL}/api/blogs/generate`, {
        topic: formData.ai_prompt || formData.title,
        category: formData.category,
        keywords: Array.isArray(formData.tags) ? formData.tags : formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        tone: 'professional',
        length: 'medium'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Populate form with generated content
      setFormData({
        ...formData,
        title: response.data.title,
        excerpt: response.data.excerpt,
        content: response.data.content,
        tags: response.data.tags || formData.tags,
      });

      toast.success('Blog content generated with AI!');
    } catch (error) {
      console.error('Error generating blog:', error);
      toast.error('Failed to generate blog content');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateNow = async () => {
    try {
      setGenerating(true);
      await axios.post(`${API_URL}/api/admin/blogs/generate-now`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Blog generation triggered! Check back in a moment.');
      setTimeout(() => {
        fetchBlogs();
        fetchStats();
      }, 3000);
    } catch (error) {
      console.error('Error triggering generation:', error);
      toast.error('Failed to trigger blog generation');
    } finally {
      setGenerating(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      draft: 'bg-gray-500/20 text-gray-600',
      published: 'bg-green-500/20 text-green-600',
      scheduled: 'bg-blue-500/20 text-blue-600',
      archived: 'bg-red-500/20 text-red-600'
    };
    return <Badge className={variants[status] || variants.draft}>{status}</Badge>;
  };

  if (showEditor) {
    return (
      <Card className="glass border-yellow-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gradient-gold">
              {selectedBlog ? 'Edit Blog' : 'Create New Blog'}
            </CardTitle>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Back to List
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* AI Generation Section */}
            <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-5 h-5 text-yellow-600" />
                <h3 className="font-bold text-yellow-600">AI Blog Generator</h3>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Enter topic or prompt for AI generation..."
                  value={formData.ai_prompt}
                  onChange={(e) => setFormData({ ...formData, ai_prompt: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                />
                <Button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={generating || !formData.ai_prompt}
                  className="w-full gradient-gold text-black"
                >
                  {generating ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Blog with AI
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                placeholder="Blog title..."
              />
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-2">Excerpt</label>
              <textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                placeholder="Brief summary..."
                rows={2}
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Content (Markdown) *</label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30 font-mono text-sm"
                placeholder="# Your Title&#10;&#10;## Section Heading&#10;&#10;Your content here..."
                rows={12}
              />
            </div>

            {/* Category and Tags */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                >
                  <option>Getting Started</option>
                  <option>Monetization</option>
                  <option>Strategy</option>
                  <option>Community</option>
                  <option>Equipment</option>
                  <option>Content</option>
                  <option>Mental Health</option>
                  <option>Branding</option>
                  <option>Performance</option>
                  <option>Events</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                  placeholder="bigo, streaming, tips"
                />
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-medium mb-2">Image URL</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                placeholder="https://..."
              />
            </div>

            {/* Status and Schedule */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Schedule (optional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-white/50 border border-yellow-500/30"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1 gradient-gold text-black">
                {loading ? 'Saving...' : selectedBlog ? 'Update Blog' : 'Create Blog'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowEditor(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Blogs</p>
                  <p className="text-2xl font-bold text-gradient-gold">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-yellow-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-green-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-green-600">{stats.published}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-gray-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
                </div>
                <Edit className="w-8 h-8 text-gray-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-blue-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Scheduled</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600/50" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass border-yellow-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Views</p>
                  <p className="text-2xl font-bold text-gradient-gold">{stats.total_views}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-yellow-600/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto-Generation Status */}
      {schedulerStatus && (
        <Card className="glass border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="w-6 h-6 text-yellow-600" />
                <div>
                  <h3 className="font-bold text-gradient-gold">Auto Blog Generator</h3>
                  <p className="text-sm text-gray-600">
                    Status: {schedulerStatus.running ? '✅ Active' : '❌ Inactive'}
                    {schedulerStatus.next_scheduled_time && (
                      <span className="ml-2">
                        | Next: {new Date(schedulerStatus.next_scheduled_time).toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Button
                onClick={handleGenerateNow}
                disabled={generating}
                className="gradient-gold text-black"
              >
                {generating ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Card className="glass border-yellow-500/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-gradient-gold">Blog Management</CardTitle>
            <Button onClick={handleCreateNew} className="gradient-gold text-black">
              <Plus className="w-4 h-4 mr-2" />
              Create New Blog
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="published">Published</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader className="w-8 h-8 animate-spin text-yellow-600" />
                </div>
              ) : blogs.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  No blogs found in this category
                </div>
              ) : (
                <div className="space-y-3">
                  {blogs.map((blog) => (
                    <div
                      key={blog.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-white/50 border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-gray-900">{blog.title}</h3>
                          {getStatusBadge(blog.status)}
                          {blog.generated_by_ai && (
                            <Badge className="bg-purple-500/20 text-purple-600">
                              <Sparkles className="w-3 h-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {blog.auto_generated && (
                            <Badge className="bg-blue-500/20 text-blue-600">Auto</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1 mb-2">{blog.excerpt}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {blog.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(blog.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {blog.read_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {blog.view_count || 0} views
                          </span>
                          {blog.bigo_profile_links?.length > 0 && (
                            <span className="flex items-center gap-1">
                              <LinkIcon className="w-3 h-3" />
                              {blog.bigo_profile_links.length} BIGO links
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/blog/${blog.slug}`, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(blog)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(blog.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default BlogsPanel;
