import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AuditionsPanel() {
  const [auditions, setAuditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudition, setSelectedAudition] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchAuditions();
  }, []);

  const fetchAuditions = async () => {
    try {
      const { data } = await axios.get(`${API}/admin/auditions`);
      setAuditions(data);
    } catch (e) {
      toast.error('Failed to load auditions');
    }
    setLoading(false);
  };

  const reviewAudition = async (status) => {
    if (!selectedAudition) return;
    try {
      await axios.put(`${API}/admin/auditions/${selectedAudition.id}/review`, {
        status,
        review_notes: reviewNotes
      });
      toast.success('Audition reviewed');
      setSelectedAudition(null);
      setReviewNotes('');
      fetchAuditions();
    } catch (e) {
      toast.error('Failed to review audition');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading auditions...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Auditions</CardTitle>
        </CardHeader>
        <CardContent>
          {auditions.length === 0 ? (
            <p className="text-gray-600">No auditions.</p>
          ) : (
            <div className="space-y-4">
              {auditions.map((audition) => (
                <Card key={audition.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold">{audition.name} ({audition.bigo_id})</h3>
                        <p className="text-gray-600">{audition.email}</p>
                        <p className="text-sm">Status: <Badge variant={audition.status === 'approved' ? 'default' : audition.status === 'rejected' ? 'destructive' : 'secondary'}>{audition.status}</Badge></p>
                        <p className="text-xs text-gray-500">Submitted: {new Date(audition.submission_date).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2">
                        {audition.video_url && (
                          <Button variant="outline" onClick={() => window.open(audition.video_url, '_blank')}>
                            View Video
                          </Button>
                        )}
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedAudition(audition)}>Review</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Review Audition: {audition.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Textarea
                                placeholder="Review notes..."
                                value={reviewNotes}
                                onChange={(e) => setReviewNotes(e.target.value)}
                              />
                              <div className="flex gap-2">
                                <Button onClick={() => reviewAudition('approved')} className="bg-green-600 hover:bg-green-700">
                                  Approve
                                </Button>
                                <Button onClick={() => reviewAudition('rejected')} className="bg-red-600 hover:bg-red-700">
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
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

export default AuditionsPanel;
