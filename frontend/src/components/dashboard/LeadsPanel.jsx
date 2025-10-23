import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function LeadsPanel() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Scan configuration
  const [scanConfig, setScanConfig] = useState({
    platforms: ['instagram', 'tiktok', 'youtube'],
    keywords: '',
    min_followers: 5000,
    max_results: 50
  });

  useEffect(() => {
    fetchLeads();
    fetchScanHistory();
    fetchStats();
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

  const fetchScanHistory = async () => {
    try {
      const { data } = await axios.get(`${API}/recruitment/scans`);
      setScanHistory(data.scans || []);
    } catch (e) {
      console.error('Failed to load scan history:', e);
    }
  };

  const fetchStats = async () => {
    try {
      const { data } = await axios.get(`${API}/recruitment/stats`);
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
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

  const startScan = async () => {
    // Validate keywords
    const keywords = scanConfig.keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) {
      toast.error('Please enter at least one keyword');
      return;
    }

    setScanning(true);
    try {
      const { data } = await axios.post(`${API}/recruitment/scan`, {
        platforms: scanConfig.platforms,
        keywords: keywords,
        min_followers: parseInt(scanConfig.min_followers),
        max_results: parseInt(scanConfig.max_results),
        auto_enrich: true
      });

      if (data.success) {
        toast.success(data.message);
        // Refresh data
        await fetchLeads();
        await fetchScanHistory();
        await fetchStats();
      } else {
        toast.error('Scan completed with errors');
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to start scan');
    } finally {
      setScanning(false);
    }
  };

  const togglePlatform = (platform) => {
    setScanConfig(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }));
  };

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getQualityColor = (score) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (loading) {
    return <div className="text-center py-8">Loading influencer leads...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total_leads}</div>
              <p className="text-sm text-gray-600">Total Leads</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.high_quality_leads}</div>
              <p className="text-sm text-gray-600">High Quality</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.recent_scans_7d}</div>
              <p className="text-sm text-gray-600">Scans (7d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.avg_quality_score}</div>
              <p className="text-sm text-gray-600">Avg Quality</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="leads" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">📋 Leads</TabsTrigger>
          <TabsTrigger value="scanner">🔍 Scanner Agent</TabsTrigger>
          <TabsTrigger value="history">📊 Scan History</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Influencer Leads</CardTitle>
              <CardDescription>
                Manage and contact potential BIGO Live hosts
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No influencer leads found.</p>
                  <p className="text-sm text-gray-500">Use the Scanner Agent to discover new leads</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Followers</TableHead>
                      <TableHead>Quality</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">{lead.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{lead.platform}</Badge>
                        </TableCell>
                        <TableCell>
                          <a 
                            href={lead.profile_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            @{lead.username}
                          </a>
                        </TableCell>
                        <TableCell>{formatNumber(lead.follower_count)}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${getQualityColor(lead.quality_score)}`}>
                            {lead.quality_score || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>{lead.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={lead.status === 'contacted' ? 'default' : 'outline'}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => sendOutreach(lead.id)} 
                            disabled={lead.status === 'contacted' || !lead.email}
                          >
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
        </TabsContent>

        <TabsContent value="scanner">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Lead Scanner Agent</CardTitle>
              <CardDescription>
                Automatically scan social media platforms for potential BIGO Live hosts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Platform Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Target Platforms</label>
                <div className="flex gap-2">
                  {['instagram', 'tiktok', 'youtube'].map(platform => (
                    <Button
                      key={platform}
                      variant={scanConfig.platforms.includes(platform) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => togglePlatform(platform)}
                      disabled={scanning}
                    >
                      {platform === 'instagram' && '📸'}
                      {platform === 'tiktok' && '🎵'}
                      {platform === 'youtube' && '▶️'}
                      {' '}
                      {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Search Keywords (comma-separated)
                </label>
                <Input
                  placeholder="e.g. live streamer, content creator, influencer"
                  value={scanConfig.keywords}
                  onChange={(e) => setScanConfig(prev => ({ ...prev, keywords: e.target.value }))}
                  disabled={scanning}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter keywords to find relevant influencers
                </p>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Min Followers</label>
                  <Input
                    type="number"
                    min="1000"
                    value={scanConfig.min_followers}
                    onChange={(e) => setScanConfig(prev => ({ ...prev, min_followers: e.target.value }))}
                    disabled={scanning}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Max Results</label>
                  <Input
                    type="number"
                    min="10"
                    max="200"
                    value={scanConfig.max_results}
                    onChange={(e) => setScanConfig(prev => ({ ...prev, max_results: e.target.value }))}
                    disabled={scanning}
                  />
                </div>
              </div>

              {/* Start Scan Button */}
              <Button 
                onClick={startScan} 
                disabled={scanning || scanConfig.platforms.length === 0}
                className="w-full"
                size="lg"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Scanning...
                  </>
                ) : (
                  '🔍 Start Lead Scan'
                )}
              </Button>

              {scanning && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    🤖 Scanner agent is searching across selected platforms...
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    This may take a few moments. Results will appear in the Leads tab.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Scan History</CardTitle>
              <CardDescription>View past lead scanning operations</CardDescription>
            </CardHeader>
            <CardContent>
              {scanHistory.length === 0 ? (
                <p className="text-center text-gray-600 py-8">No scan history yet</p>
              ) : (
                <div className="space-y-4">
                  {scanHistory.map(scan => (
                    <Card key={scan.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold">
                              {scan.keywords.join(', ')}
                            </div>
                            <div className="text-sm text-gray-600">
                              Platforms: {scan.platforms.join(', ')}
                            </div>
                          </div>
                          <Badge variant={scan.status === 'completed' ? 'default' : scan.status === 'failed' ? 'destructive' : 'secondary'}>
                            {scan.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600">
                          <span>Found: {scan.results?.total_found || 0}</span>
                          {' • '}
                          <span>Saved: {scan.results?.total_saved || 0}</span>
                          {' • '}
                          <span>Duplicates: {scan.results?.total_duplicates || 0}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-2">
                          {new Date(scan.started_at).toLocaleString()} by {scan.initiated_by_name}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LeadsPanel;
