import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function TasksPanel({ user }) {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [proofUrl, setProofUrl] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchSubmissions();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data } = await axios.get(`${API}/tasks`);
      setTasks(data);
    } catch (e) {
      toast.error('Failed to load tasks');
    }
  };

  const fetchSubmissions = async () => {
    try {
      const { data } = await axios.get(`${API}/task-submissions`);
      setSubmissions(data);
    } catch (e) {
      toast.error('Failed to load submissions');
    }
    setLoading(false);
  };

  const submitTask = async () => {
    if (!selectedTask || !proofUrl.trim()) return;
    setIsSubmitting(true);
    try {
      await axios.post(`${API}/tasks/${selectedTask.id}/submit`, {
        proof_url: proofUrl.trim(),
        note: note.trim()
      });
      toast.success('Task submitted successfully');
      setSelectedTask(null);
      setProofUrl('');
      setNote('');
      fetchSubmissions();
    } catch (e) {
      toast.error('Failed to submit task');
    }
    setIsSubmitting(false);
  };

  const reviewSubmission = async (submissionId, status) => {
    try {
      await axios.put(`${API}/task-submissions/${submissionId}/review`, { status });
      toast.success('Submission reviewed');
      fetchSubmissions();
    } catch (e) {
      toast.error('Failed to review submission');
    }
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'owner' || user?.role === 'coach';

  if (loading) {
    return <div className="text-center py-8">Loading tasks...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-gray-600">No tasks available.</p>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => {
                const userSubmission = submissions.find(s => s.task_id === task.id && s.user_id === user?.id);
                return (
                  <Card key={task.id} className="border border-gray-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{task.title}</h3>
                          <p className="text-gray-600">{task.description}</p>
                          <div className="mt-2 space-y-1">
                            <p className="text-sm"><strong>Points:</strong> {task.points}</p>
                            <p className="text-sm"><strong>Category:</strong> {task.category}</p>
                            {task.due_at && <p className="text-sm"><strong>Due:</strong> {new Date(task.due_at).toLocaleString()}</p>}
                          </div>
                          {userSubmission && (
                            <Badge variant={userSubmission.status === 'approved' ? 'default' : userSubmission.status === 'rejected' ? 'destructive' : 'secondary'} className="mt-2">
                              {userSubmission.status}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          {!userSubmission && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button onClick={() => setSelectedTask(task)}>Submit Proof</Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Submit Proof for {task.title}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="proof-url">Proof URL</Label>
                                    <Input
                                      id="proof-url"
                                      value={proofUrl}
                                      onChange={(e) => setProofUrl(e.target.value)}
                                      placeholder="Link to your proof (screenshot, video, etc.)"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor="note">Note (optional)</Label>
                                    <Textarea
                                      id="note"
                                      value={note}
                                      onChange={(e) => setNote(e.target.value)}
                                      placeholder="Additional notes..."
                                    />
                                  </div>
                                  <Button onClick={submitTask} disabled={isSubmitting} className="w-full">
                                    {isSubmitting ? 'Submitting...' : 'Submit'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                          {userSubmission && userSubmission.status === 'pending' && (
                            <p className="text-sm text-yellow-600">Awaiting review</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Review Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {submissions.filter(s => s.status === 'pending').length === 0 ? (
              <p className="text-gray-600">No pending submissions.</p>
            ) : (
              <div className="space-y-4">
                {submissions.filter(s => s.status === 'pending').map((submission) => (
                  <Card key={submission.id} className="border border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold">Task: {tasks.find(t => t.id === submission.task_id)?.title}</h3>
                          <p className="text-gray-600">User: {submission.user_id}</p>
                          <p className="text-sm">Proof: <a href={submission.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-600">{submission.proof_url}</a></p>
                          {submission.note && <p className="text-sm">Note: {submission.note}</p>}
                          <p className="text-xs text-gray-500">Submitted: {new Date(submission.submitted_at).toLocaleString()}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => reviewSubmission(submission.id, 'approved')} variant="outline" className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
                            Approve
                          </Button>
                          <Button onClick={() => reviewSubmission(submission.id, 'rejected')} variant="outline" className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100">
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TasksPanel;
