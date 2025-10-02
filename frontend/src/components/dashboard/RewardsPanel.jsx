import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function RewardsPanel({ user }) {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState(0);

  useEffect(() => {
    fetchRewards();
    if (user) {
      setUserPoints(user.total_points || 0);
    }
  }, [user]);

  const fetchRewards = async () => {
    try {
      const { data } = await axios.get(`${API}/rewards`);
      setRewards(data);
    } catch (e) {
      toast.error('Failed to load rewards');
    }
    setLoading(false);
  };

  const redeemReward = async (rewardId, costPoints) => {
    if (userPoints < costPoints) {
      toast.error('Insufficient points to redeem this reward');
      return;
    }
    try {
      await axios.post(`${API}/rewards/${rewardId}/redeem`);
      toast.success('Reward redeemed successfully');
      setUserPoints(userPoints - costPoints);
    } catch (e) {
      toast.error('Failed to redeem reward');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading rewards...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4">Your Points: <Badge>{userPoints}</Badge></p>
          {rewards.length === 0 ? (
            <p className="text-gray-600">No rewards available.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <Card key={reward.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg">{reward.title}</h3>
                    <p className="text-gray-600 mb-2">Cost: {reward.cost_points} points</p>
                    <p className="text-sm mb-4">{reward.terms}</p>
                    <Button
                      onClick={() => redeemReward(reward.id, reward.cost_points)}
                      disabled={userPoints < reward.cost_points}
                      className="w-full"
                    >
                      Redeem
                    </Button>
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

export default RewardsPanel;
