import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

function SettingsPanel() {
  const [groqKey, setGroqKey] = useState('');
  const [keyPreview, setKeyPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${backendUrl}/api/admin/settings/groq_api_key`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setKeyPreview(data.value_masked || '');
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!groqKey.trim()) {
      toast.error('Please enter an API key');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${backendUrl}/api/admin/settings/groq-key`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ value: groqKey })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Groq API key updated successfully! Services will reload automatically.');
        setKeyPreview(data.key_preview || '');
        setGroqKey('');
      } else {
        toast.error(data.detail || 'Failed to update API key');
      }
    } catch (error) {
      console.error('Error updating key:', error);
      toast.error('Failed to update API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-black/60 border-yellow-500/20 text-white">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <span>⚙️</span>
            <span className="bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
              Admin Settings
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Groq API Key Section */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-yellow-500 mb-2">Groq API Configuration</h3>
              <p className="text-sm text-gray-400 mb-4">
                Configure the Groq API key for AI services (Chat, TTS, STT). Changes take effect immediately without restart.
              </p>
            </div>

            {loadingSettings ? (
              <div className="text-center py-4 text-gray-400">Loading settings...</div>
            ) : (
              <>
                {/* Current Key Preview */}
                {keyPreview && (
                  <div className="bg-black/40 border border-yellow-500/10 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">Current API Key</div>
                    <div className="font-mono text-yellow-500/70">{keyPreview}</div>
                  </div>
                )}

                {/* Update Key Form */}
                <div className="space-y-3">
                  <label className="text-sm text-gray-300">New Groq API Key</label>
                  <Input
                    type="password"
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="Enter new Groq API key"
                    className="bg-black/40 border-yellow-500/20 text-white placeholder:text-gray-500"
                  />
                  <Button
                    onClick={handleUpdateKey}
                    disabled={loading || !groqKey.trim()}
                    className="bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-semibold hover:brightness-110 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⏳</span>
                        Updating...
                      </>
                    ) : (
                      'Update API Key'
                    )}
                  </Button>
                </div>

                {/* Help Text */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="text-sm text-blue-400">
                    <strong>ℹ️ How to get a Groq API key:</strong>
                    <ol className="mt-2 ml-4 space-y-1 list-decimal">
                      <li>Visit <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline">console.groq.com</a></li>
                      <li>Sign up or log in to your account</li>
                      <li>Navigate to API Keys section</li>
                      <li>Create a new API key and copy it here</li>
                    </ol>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Future Settings Sections */}
          <div className="border-t border-yellow-500/20 pt-6">
            <h3 className="text-lg font-semibold text-yellow-500 mb-2">Additional Settings</h3>
            <p className="text-sm text-gray-400">More configuration options coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPanel;
