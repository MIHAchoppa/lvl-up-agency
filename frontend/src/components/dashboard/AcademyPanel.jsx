import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AcademyPanel() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchResources();
  }, [category]);

  const fetchResources = async () => {
    try {
      const params = {};
      if (category && category !== 'all') params.category = category;
      const { data } = await axios.get(`${API}/resources`, { params });
      setResources(data);
    } catch (e) {
      toast.error('Failed to load resources');
      // Fallback to sample data if API not implemented
      setResources([
        { id: 1, title: 'BIGO Live Basics', category: 'getting_started', type: 'video', content_url: 'https://example.com/video1' },
        { id: 2, title: 'Tier Climbing Strategies', category: 'strategy', type: 'article', content_text: 'Learn how to climb tiers effectively...' },
        { id: 3, title: 'PK Battle Tips', category: 'pk', type: 'guide', content_url: 'https://example.com/guide1' }
      ]);
    }
    setLoading(false);
  };

  const filteredResources = resources.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-8">Loading academy resources...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>BIGO Academy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Input
              placeholder="Search resources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="getting_started">Getting Started</SelectItem>
                <SelectItem value="strategy">Strategy</SelectItem>
                <SelectItem value="pk">PK Battles</SelectItem>
                <SelectItem value="monetization">Monetization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredResources.length === 0 ? (
            <p className="text-gray-600">No resources found.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredResources.map((resource) => (
                <Card key={resource.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{resource.title}</h3>
                      <Badge variant="outline">{resource.category}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{resource.type}</p>
                    {resource.content_url && (
                      <Button asChild className="w-full">
                        <a href={resource.content_url} target="_blank" rel="noopener noreferrer">
                          View Resource
                        </a>
                      </Button>
                    )}
                    {resource.content_text && (
                      <p className="text-sm">{resource.content_text.substring(0, 100)}...</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AcademyPanel;
