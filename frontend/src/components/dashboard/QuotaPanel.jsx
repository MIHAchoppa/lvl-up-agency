import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function QuotaPanel() {
  const [quotas, setQuotas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuotas();
  }, []);

  const fetchQuotas = async () => {
    try {
      const { data } = await axios.get(`${API}/quotas`);
      setQuotas(data);
    } catch (e) {
      toast.error('Failed to load quota targets');
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Loading quota targets...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Beans / Quota</CardTitle>
        </CardHeader>
        <CardContent>
          {quotas.length === 0 ? (
            <p className="text-gray-600">No quota targets set.</p>
          ) : (
            <div className="space-y-4">
              {quotas.map((quota) => {
                const progressPercent = Math.min(100, (quota.current_progress / quota.target_amount) * 100);
                return (
                  <div key={quota.id}>
                    <h3 className="font-semibold">{quota.target_type}</h3>
                    <Progress value={progressPercent} className="mb-1" />
                    <p className="text-sm text-gray-600">
                      {quota.current_progress} / {quota.target_amount} beans ({progressPercent.toFixed(1)}%)
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default QuotaPanel;
