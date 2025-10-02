import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function AdminAgentPanel() {
  const [actionType, setActionType] = useState('');
  const [actionData, setActionData] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const executeAction = async () => {
    if (!actionType) {
      toast.error('Please select an action type');
      return;
    }
    let parsedData = {};
    try {
      parsedData = actionData ? JSON.parse(actionData) : {};
    } catch (e) {
      toast.error('Invalid JSON in action data');
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/admin/execute`, {
        action_type: actionType,
        params: parsedData
      });
      setResult(data);
      toast.success('Action executed');
    } catch (e) {
      toast.error('Failed to execute action');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Admin Agent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={actionType} onValueChange={setActionType}>
              <SelectTrigger>
                <SelectValue placeholder="Select Action Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="create_event">Create Event</SelectItem>
                <SelectItem value="update_categories">Update Categories</SelectItem>
                <SelectItem value="bulk_user_management">Bulk User Management</SelectItem>
                <SelectItem value="system_announcement">System Announcement</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Enter action data as JSON"
              value={actionData}
              onChange={(e) => setActionData(e.target.value)}
              rows={8}
            />
            <Button onClick={executeAction} disabled={loading}>
              {loading ? 'Executing...' : 'Execute Action'}
            </Button>
            {result && (
              <pre className="mt-4 p-4 bg-gray-100 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminAgentPanel;
