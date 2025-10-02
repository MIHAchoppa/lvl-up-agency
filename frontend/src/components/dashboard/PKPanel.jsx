import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function PKPanel() {
  const [pkEvents, setPkEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPkEvents();
  }, []);

  const fetchPkEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events?event_type=pk`);
      setPkEvents(data);
    } catch (e) {
      toast.error('Failed to load PK events');
    }
    setLoading(false);
  };

  const signUpForPk = async (eventId) => {
    try {
      await axios.post(`${API}/events/${eventId}/rsvp`, { status: 'going' });
      toast.success('Signed up for PK event');
      fetchPkEvents(); // Refresh to update status
    } catch (e) {
      toast.error('Failed to sign up');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading PK events...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>PK Sign-ups</CardTitle>
        </CardHeader>
        <CardContent>
          {pkEvents.length === 0 ? (
            <p className="text-gray-600">No PK events available.</p>
          ) : (
            <div className="space-y-4">
              {pkEvents.map((event) => (
                <Card key={event.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-gray-600">{event.description}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm"><strong>Start:</strong> {new Date(event.start_time).toLocaleString()}</p>
                          {event.location && <p className="text-sm"><strong>Location:</strong> {event.location}</p>}
                          {event.max_participants && <p className="text-sm"><strong>Max Participants:</strong> {event.max_participants}</p>}
                        </div>
                      </div>
                      <Button onClick={() => signUpForPk(event.id)} className="bg-gold hover:bg-gold/90">
                        Sign Up
                      </Button>
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

export default PKPanel;
