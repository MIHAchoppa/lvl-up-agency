import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function ContentManagerPanel() {
  const [taskForm, setTaskForm] = useState({ title: '', description: '', points: 0, category: 'general' });
  const [quizForm, setQuizForm] = useState({ title: '', topic: '', difficulty: 'medium', questions: [] });
  const [rewardForm, setRewardForm] = useState({ title: '', cost_points: 0, terms: '', category: 'general' });
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', pinned: false });

  const createTask = async () => {
    try {
      await axios.post(`${API}/tasks`, taskForm);
      toast.success('Task created');
      setTaskForm({ title: '', description: '', points: 0, category: 'general' });
    } catch (e) {
      toast.error('Failed to create task');
    }
  };

  const createQuiz = async () => {
    try {
      await axios.post(`${API}/quizzes`, quizForm);
      toast.success('Quiz created');
      setQuizForm({ title: '', topic: '', difficulty: 'medium', questions: [] });
    } catch (e) {
      toast.error('Failed to create quiz');
    }
  };

  const createReward = async () => {
    try {
      await axios.post(`${API}/rewards`, rewardForm);
      toast.success('Reward created');
      setRewardForm({ title: '', cost_points: 0, terms: '', category: 'general' });
    } catch (e) {
      toast.error('Failed to create reward');
    }
  };

  const createAnnouncement = async () => {
    try {
      await axios.post(`${API}/announcements`, announcementForm);
      toast.success('Announcement created');
      setAnnouncementForm({ title: '', body: '', pinned: false });
    } catch (e) {
      toast.error('Failed to create announcement');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Content Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
              <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
              <TabsTrigger value="rewards">Rewards</TabsTrigger>
              <TabsTrigger value="announcements">Announcements</TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="task-points">Points</Label>
                  <Input
                    id="task-points"
                    type="number"
                    value={taskForm.points}
                    onChange={(e) => setTaskForm({ ...taskForm, points: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="task-description">Description</Label>
                <Textarea
                  id="task-description"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="task-category">Category</Label>
                <Select value={taskForm.category} onValueChange={(value) => setTaskForm({ ...taskForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="streaming">Streaming</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={createTask}>Create Task</Button>
            </TabsContent>

            <TabsContent value="quizzes" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="quiz-title">Title</Label>
                  <Input
                    id="quiz-title"
                    value={quizForm.title}
                    onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz-topic">Topic</Label>
                  <Input
                    id="quiz-topic"
                    value={quizForm.topic}
                    onChange={(e) => setQuizForm({ ...quizForm, topic: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="quiz-difficulty">Difficulty</Label>
                  <Select value={quizForm.difficulty} onValueChange={(value) => setQuizForm({ ...quizForm, difficulty: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={createQuiz}>Create Quiz</Button>
            </TabsContent>

            <TabsContent value="rewards" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="reward-title">Title</Label>
                  <Input
                    id="reward-title"
                    value={rewardForm.title}
                    onChange={(e) => setRewardForm({ ...rewardForm, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="reward-cost">Cost Points</Label>
                  <Input
                    id="reward-cost"
                    type="number"
                    value={rewardForm.cost_points}
                    onChange={(e) => setRewardForm({ ...rewardForm, cost_points: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reward-terms">Terms</Label>
                <Textarea
                  id="reward-terms"
                  value={rewardForm.terms}
                  onChange={(e) => setRewardForm({ ...rewardForm, terms: e.target.value })}
                />
              </div>
              <Button onClick={createReward}>Create Reward</Button>
            </TabsContent>

            <TabsContent value="announcements" className="space-y-4">
              <div>
                <Label htmlFor="ann-title">Title</Label>
                <Input
                  id="ann-title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="ann-body">Body</Label>
                <Textarea
                  id="ann-body"
                  value={announcementForm.body}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, body: e.target.value })}
                />
              </div>
              <Button onClick={createAnnouncement}>Create Announcement</Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export default ContentManagerPanel;
