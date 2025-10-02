import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data } = await axios.get(`${API}/announcements`);
      setAnnouncements(data);
    } catch (e) {
      toast.error('Failed to load announcements');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading announcements...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="text-gray-600">No announcements.</p>
          ) : (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <Card key={ann.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{ann.title}</h3>
                      {ann.pinned && <Badge variant="destructive">Pinned</Badge>}
                    </div>
                    <p className="text-gray-600 mb-2">{ann.body}</p>
                    <p className="text-xs text-gray-500">Published: {new Date(ann.publish_at).toLocaleString()}</p>
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

export default AnnouncementsPanel;
