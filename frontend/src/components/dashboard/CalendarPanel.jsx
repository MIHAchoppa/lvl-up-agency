import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function CalendarPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await axios.get(`${API}/events`);
      setEvents(data);
    } catch (e) {
      toast.error('Failed to load events');
    }
    setLoading(false);
  };

  const handleRSVP = async (eventId, status) => {
    try {
      await axios.post(`${API}/events/${eventId}/rsvp`, { status });
      toast.success('RSVP updated');
      fetchEvents(); // Refresh to update RSVP status
    } catch (e) {
      toast.error('Failed to update RSVP');
    }
  };

  const showAttendees = async (eventId) => {
    try {
      const { data } = await axios.get(`${API}/events/${eventId}/attendees`);
      setAttendees(data);
      setSelectedEvent(eventId);
    } catch (e) {
      toast.error('Failed to load attendees');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading events...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Community Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-gray-600">No events scheduled.</p>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{event.title}</h3>
                        <p className="text-gray-600">{event.description}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm"><strong>Type:</strong> {event.event_type}</p>
                          <p className="text-sm"><strong>Start:</strong> {new Date(event.start_time).toLocaleString()}</p>
                          {event.end_time && <p className="text-sm"><strong>End:</strong> {new Date(event.end_time).toLocaleString()}</p>}
                          {event.location && <p className="text-sm"><strong>Location:</strong> {event.location}</p>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => handleRSVP(event.id, 'going')} variant="outline" size="sm">Going</Button>
                        <Button onClick={() => handleRSVP(event.id, 'interested')} variant="outline" size="sm">Interested</Button>
                        <Button onClick={() => showAttendees(event.id)} variant="outline" size="sm">View Attendees</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEvent && (
        <Card>
          <CardHeader>
            <CardTitle>Attendees for Event</CardTitle>
          </CardHeader>
          <CardContent>
            {attendees.length === 0 ? (
              <p className="text-gray-600">No attendees yet.</p>
            ) : (
              <div className="space-y-2">
                {attendees.map((attendee, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span>{attendee.user?.name} ({attendee.user?.bigo_id})</span>
                    <Badge variant={attendee.status === 'going' ? 'default' : 'secondary'}>{attendee.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CalendarPanel;
