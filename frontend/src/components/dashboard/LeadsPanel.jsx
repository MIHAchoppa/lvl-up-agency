import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data } = await axios.get(`${API}/recruitment/leads`);
      setLeads(data);
    } catch (e) {
      toast.error('Failed to load influencer leads');
    }
    setLoading(false);
  };

  const sendOutreach = async (leadId) => {
    try {
      await axios.post(`${API}/recruitment/outreach`, { lead_ids: [leadId] });
      toast.success('Outreach email sent');
      fetchLeads();
    } catch (e) {
      toast.error('Failed to send outreach email');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading influencer leads...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Influencer Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <p className="text-gray-600">No influencer leads found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Followers</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>{lead.name}</TableCell>
                    <TableCell>{lead.platform}</TableCell>
                    <TableCell>{lead.username}</TableCell>
                    <TableCell>{lead.follower_count}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>{lead.status}</TableCell>
                    <TableCell>
                      <Button onClick={() => sendOutreach(lead.id)} disabled={lead.status === 'contacted'}>
                        {lead.status === 'contacted' ? 'Contacted' : 'Send Outreach'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LeadsPanel;
