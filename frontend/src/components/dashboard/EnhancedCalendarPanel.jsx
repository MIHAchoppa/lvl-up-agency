import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Calendar } from '../ui/calendar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function EnhancedCalendarPanel() {
  const [events, setEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [filters, setFilters] = useState({
    type: 'all',
    status: 'all'
  });

  // Event creation form
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    event_type: 'community',
    start_time: '',
    end_time: '',
    location: '',
    max_participants: '',
    bigo_live_link: '',
    flyer_url: ''
  });

  const eventTypes = [
    { value: 'personal', label: '👤 Personal', color: 'bg-blue-100 text-blue-800' },
    { value: 'pk', label: '⚔️ PK Battle', color: 'bg-red-100 text-red-800' },
    { value: 'show', label: '🎭 Show', color: 'bg-purple-100 text-purple-800' },
    { value: 'community', label: '👥 Community', color: 'bg-green-100 text-green-800' },
    { value: 'agency', label: '🏢 Agency', color: 'bg-orange-100 text-orange-800' }
  ];

  useEffect(() => {
    fetchEvents();
  }, [filters]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `${API}/events`;
      const params = new URLSearchParams();
      
      if (filters.type !== 'all') {
        params.append('event_type', filters.type);
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const { data } = await axios.get(url);
      setEvents(data);
    } catch (error) {
      console.error('Events fetch error:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendees = async (eventId) => {
    try {
      const { data } = await axios.get(`${API}/events/${eventId}/attendees`);
      setAttendees(data);
    } catch (error) {
      console.error('Attendees fetch error:', error);
      toast.error('Failed to load attendees');
    }
  };

  const handleRSVP = async (eventId, status) => {
    try {
      await axios.post(`${API}/events/${eventId}/rsvp`, { status });
      toast.success(`RSVP updated: ${status}`);
      
      // Refresh attendees if viewing event details
      if (selectedEvent && selectedEvent.id === eventId) {
        fetchAttendees(eventId);
      }
      
      // Optionally refresh events to update RSVP status
      fetchEvents();
    } catch (error) {
      console.error('RSVP error:', error);
      toast.error('Failed to update RSVP');
    }
  };

  const createEvent = async () => {
    try {
      if (!eventForm.title || !eventForm.start_time) {
        toast.error('Title and start time are required');
        return;
      }

      // Format datetime for API
      const formattedEvent = {
        ...eventForm,
        start_time: new Date(eventForm.start_time).toISOString(),
        end_time: eventForm.end_time ? new Date(eventForm.end_time).toISOString() : null,
        max_participants: eventForm.max_participants ? parseInt(eventForm.max_participants) : null
      };

      await axios.post(`${API}/events`, formattedEvent);
      
      toast.success('Event created successfully!');
      setShowEventDialog(false);
      setEventForm({
        title: '',
        description: '',
        event_type: 'community',
        start_time: '',
        end_time: '',
        location: '',
        max_participants: '',
        bigo_live_link: '',
        flyer_url: ''
      });
      
      fetchEvents();
    } catch (error) {
      console.error('Event creation error:', error);
      toast.error('Failed to create event');
    }
  };

  const getSmartEventSuggestions = async () => {
    try {
      // This would call the AI service for event suggestions
      const response = await axios.post(`${API}/admin-assistant/chat`, {
        message: "Suggest optimal events for this week based on current performance metrics",
        auto_execute: false
      });
      
      if (response.data.success) {
        toast.success('AI suggestions generated! Check admin assistant for details.');
      }
    } catch (error) {
      console.error('Smart suggestions error:', error);
      toast.error('Failed to get AI suggestions');
    }
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const getEventTypeInfo = (type) => {
    return eventTypes.find(t => t.value === type) || eventTypes[0];
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const upcomingEvents = events
    .filter(event => new Date(event.start_time) > new Date())
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .slice(0, 5);

  const todayEvents = getEventsForDate(new Date());

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              📅 Enhanced Calendar & Events
              <Badge variant="secondary">AI-Powered</Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={getSmartEventSuggestions} variant="outline" size="sm">
                🧠 AI Suggestions
              </Button>
              <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">➕ Create Event</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Event</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Title*</label>
                        <Input
                          value={eventForm.title}
                          onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                          placeholder="Event title"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Type</label>
                        <Select value={eventForm.event_type} onValueChange={(value) => setEventForm({...eventForm, event_type: value})}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {eventTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={eventForm.description}
                        onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                        placeholder="Event description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Start Time*</label>
                        <Input
                          type="datetime-local"
                          value={eventForm.start_time}
                          onChange={(e) => setEventForm({...eventForm, start_time: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">End Time</label>
                        <Input
                          type="datetime-local"
                          value={eventForm.end_time}
                          onChange={(e) => setEventForm({...eventForm, end_time: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Location</label>
                        <Input
                          value={eventForm.location}
                          onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                          placeholder="Event location or platform"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Max Participants</label>
                        <Input
                          type="number"
                          value={eventForm.max_participants}
                          onChange={(e) => setEventForm({...eventForm, max_participants: e.target.value})}
                          placeholder="Optional limit"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium">BIGO Live Link</label>
                      <Input
                        value={eventForm.bigo_live_link}
                        onChange={(e) => setEventForm({...eventForm, bigo_live_link: e.target.value})}
                        placeholder="https://bigo.live/..."
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Event Flyer URL</label>
                      <Input
                        value={eventForm.flyer_url}
                        onChange={(e) => setEventForm({...eventForm, flyer_url: e.target.value})}
                        placeholder="https://example.com/flyer.jpg"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setShowEventDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={createEvent}>
                        Create Event
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {eventTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasEvents: (date) => getEventsForDate(date).length > 0
              }}
              modifiersStyles={{
                hasEvents: { 
                  backgroundColor: 'rgb(59 130 246)', 
                  color: 'white',
                  fontWeight: 'bold'
                }
              }}
            />
            
            {/* Events for Selected Date */}
            {selectedDate && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">
                  Events for {selectedDate.toDateString()}
                </h4>
                {getEventsForDate(selectedDate).length === 0 ? (
                  <p className="text-gray-500 text-sm">No events scheduled</p>
                ) : (
                  <div className="space-y-2">
                    {getEventsForDate(selectedDate).map((event) => {
                      const typeInfo = getEventTypeInfo(event.event_type);
                      const dateTime = formatDateTime(event.start_time);
                      
                      return (
                        <Card key={event.id} className="border border-gray-200">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h5 className="font-medium text-sm">{event.title}</h5>
                                  <Badge className={typeInfo.color}>
                                    {typeInfo.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-gray-600">{dateTime.time}</p>
                                {event.description && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {event.description.slice(0, 50)}...
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedEvent(event);
                                    fetchAttendees(event.id);
                                  }}
                                >
                                  View
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar - Upcoming Events & Quick Actions */}
        <div className="space-y-6">
          {/* Today's Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Today's Events</CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No events today</p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.map((event) => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    const dateTime = formatDateTime(event.start_time);
                    
                    return (
                      <div key={event.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-gray-500">{dateTime.time}</p>
                        </div>
                        <Badge className={typeInfo.color} size="sm">
                          {typeInfo.value}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-sm">No upcoming events</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => {
                    const typeInfo = getEventTypeInfo(event.event_type);
                    const dateTime = formatDateTime(event.start_time);
                    
                    return (
                      <Card key={event.id} className="border border-gray-100">
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-sm">{event.title}</h5>
                              <Badge className={typeInfo.color} size="sm">
                                {typeInfo.value}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            {dateTime.date} at {dateTime.time}
                          </p>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRSVP(event.id, 'going')}
                              className="text-xs"
                            >
                              ✅ Going
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRSVP(event.id, 'interested')}
                              className="text-xs"
                            >
                              ⭐ Interested
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Event Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Events:</span>
                  <span className="font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>This Week:</span>
                  <span className="font-medium">
                    {events.filter(e => {
                      const eventDate = new Date(e.start_time);
                      const weekStart = new Date();
                      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                      const weekEnd = new Date(weekStart);
                      weekEnd.setDate(weekEnd.getDate() + 6);
                      return eventDate >= weekStart && eventDate <= weekEnd;
                    }).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>PK Battles:</span>
                  <span className="font-medium">
                    {events.filter(e => e.event_type === 'pk').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Community:</span>
                  <span className="font-medium">
                    {events.filter(e => e.event_type === 'community').length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedEvent.title}
                <Badge className={getEventTypeInfo(selectedEvent.event_type).color}>
                  {getEventTypeInfo(selectedEvent.event_type).label}
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Start:</strong> {formatDateTime(selectedEvent.start_time).date} at {formatDateTime(selectedEvent.start_time).time}
                </div>
                {selectedEvent.end_time && (
                  <div>
                    <strong>End:</strong> {formatDateTime(selectedEvent.end_time).date} at {formatDateTime(selectedEvent.end_time).time}
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <strong>Location:</strong> {selectedEvent.location}
                  </div>
                )}
                {selectedEvent.max_participants && (
                  <div>
                    <strong>Max Participants:</strong> {selectedEvent.max_participants}
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <strong>Description:</strong>
                  <p className="mt-1 text-sm text-gray-600">{selectedEvent.description}</p>
                </div>
              )}

              {selectedEvent.bigo_live_link && (
                <div>
                  <strong>BIGO Live:</strong>
                  <a 
                    href={selectedEvent.bigo_live_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-blue-600 hover:underline text-sm"
                  >
                    Join Live Stream 🔗
                  </a>
                </div>
              )}

              {attendees.length > 0 && (
                <div>
                  <strong>Attendees ({attendees.length}):</strong>
                  <div className="mt-2 space-y-1">
                    {attendees.map((attendee, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span>{attendee.user?.name} ({attendee.user?.bigo_id})</span>
                        <Badge variant={attendee.status === 'going' ? 'default' : 'secondary'}>
                          {attendee.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={() => handleRSVP(selectedEvent.id, 'going')}>
                  ✅ I'm Going
                </Button>
                <Button variant="outline" onClick={() => handleRSVP(selectedEvent.id, 'interested')}>
                  ⭐ Interested
                </Button>
                <Button variant="outline" onClick={() => handleRSVP(selectedEvent.id, 'cancelled')}>
                  ❌ Can't Attend
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default EnhancedCalendarPanel;