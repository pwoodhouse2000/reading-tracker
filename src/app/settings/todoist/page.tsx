'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle2, AlertCircle, ArrowLeft, Sparkles, Download, Settings } from 'lucide-react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
}

interface LastSync {
  id: string;
  projectId: string;
  lastSyncedAt: string;
  syncStatus: string;
  errorMessage: string | null;
  itemsSynced: number;
}

export default function TodoistSettingsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    success: boolean;
    message: string;
    synced?: number;
    skipped?: number;
    enriched?: number;
    errors?: string[];
  } | null>(null);
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [autoComplete, setAutoComplete] = useState(true);
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchLastSync();
  }, []);

  async function fetchProjects() {
    setLoadingProjects(true);
    try {
      const response = await fetch('/api/todoist/projects');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch projects');
      }

      setProjects(data.projects);
      setConfigured(true);
    } catch (error) {
      console.error('Error fetching projects:', error);
      setConfigured(false);
    } finally {
      setLoadingProjects(false);
    }
  };

  async function fetchLastSync() {
    try {
      const response = await fetch('/api/todoist/sync');
      const data = await response.json();
      if (data.lastSync) {
        setLastSync(data.lastSync);
      }
    } catch (error) {
      console.error('Error fetching last sync:', error);
    }
  };

  const handleSync = async () => {
    if (!selectedProjectId) {
      alert('Please select a project first');
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const response = await fetch('/api/todoist/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          autoComplete,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      setSyncResult(data);
      fetchLastSync();
    } catch (error) {
      console.error('Error syncing:', error);
      setSyncResult({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white shadow-lg">
            <Download className="h-5 w-5" />
          </div>
          <h1 className="text-3xl font-bold">Todoist Integration</h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Import books from your Todoist project automatically
        </p>
      </div>

      {/* Setup Instructions */}
      {!configured && (
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-amber-900">Configuration Required</CardTitle>
            </div>
            <CardDescription className="text-amber-700">
              Set up your Todoist API token to enable sync
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="list-decimal list-inside space-y-3 text-sm text-amber-900">
              <li>
                Go to{' '}
                <a 
                  href="https://todoist.com/app/settings/integrations/developer" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-primary hover:underline font-medium"
                >
                  Todoist Settings → Integrations → Developer
                </a>
              </li>
              <li>Copy your API token</li>
              <li>
                Add it to your <code className="bg-amber-200/50 px-1.5 py-0.5 rounded font-mono text-xs">.env</code> file:
                <pre className="bg-amber-100 p-3 rounded-lg mt-2 text-xs font-mono overflow-x-auto">
                  TODOIST_API_TOKEN="your-token-here"
                </pre>
              </li>
              <li>Restart the development server</li>
              <li>Refresh this page</li>
            </ol>
            <Button onClick={fetchProjects} variant="outline" size="sm" className="border-2 border-amber-300">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sync Settings */}
      {configured && (
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-primary/5 to-accent/5">
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              <CardTitle>Sync Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your Todoist sync preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Connected
              </Badge>
              <span className="text-sm text-muted-foreground">Todoist API token is configured</span>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary focus:ring-0 transition-all bg-white"
                disabled={loadingProjects}
              >
                <option value="">-- Select your reading list project --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-2">
                Choose your "Stuff to Read" or similar project containing book tasks
              </p>
            </div>

            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <input
                type="checkbox"
                id="autoComplete"
                checked={autoComplete}
                onChange={(e) => setAutoComplete(e.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <div>
                <label htmlFor="autoComplete" className="text-sm font-medium cursor-pointer">
                  Mark tasks as complete in Todoist
                </label>
                <p className="text-xs text-muted-foreground">
                  After syncing, tasks will be marked complete so they won't sync again
                </p>
              </div>
            </div>

            {selectedProjectId && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="w-full shadow-lg shadow-primary/25"
                size="lg"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Syncing & Enriching...
                  </>
                ) : (
                  <>
                    <Download className="h-5 w-5 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Result */}
      {syncResult && (
        <Card className={`border-0 shadow-xl ${syncResult.success ? 'bg-gradient-to-br from-emerald-50 to-green-50' : 'bg-gradient-to-br from-red-50 to-rose-50'}`}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {syncResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <CardTitle className={syncResult.success ? 'text-emerald-900' : 'text-red-900'}>
                {syncResult.success ? 'Sync Complete' : 'Sync Failed'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className={`text-sm ${syncResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
              {syncResult.message}
            </p>
            
            {syncResult.success && (
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white/60 rounded-xl">
                  <p className="text-2xl font-bold text-emerald-600">{syncResult.synced || 0}</p>
                  <p className="text-xs text-muted-foreground">Books Added</p>
                </div>
                <div className="text-center p-3 bg-white/60 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{syncResult.enriched || 0}</p>
                  <p className="text-xs text-muted-foreground">With Covers</p>
                </div>
                <div className="text-center p-3 bg-white/60 rounded-xl">
                  <p className="text-2xl font-bold text-gray-600">{syncResult.skipped || 0}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>
            )}

            {syncResult.errors && syncResult.errors.length > 0 && (
              <div className="p-3 bg-red-100 rounded-xl">
                <p className="text-sm font-medium text-red-800 mb-2">Errors:</p>
                <ul className="text-xs text-red-700 space-y-1">
                  {syncResult.errors.map((error, idx) => (
                    <li key={idx}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Sync Info */}
      {lastSync && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">Last Sync</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Date</p>
                <p className="font-medium">
                  {new Date(lastSync.lastSyncedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <Badge variant={lastSync.syncStatus === 'success' ? 'default' : 'destructive'}>
                  {lastSync.syncStatus}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Books Synced</p>
                <p className="font-medium">{lastSync.itemsSynced}</p>
              </div>
            </div>
            {lastSync.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">{lastSync.errorMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* How It Works */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/80 to-indigo-50/80">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">How It Works</h3>
          </div>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">1.</span>
              <span>Each task in your selected project becomes a book entry</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">2.</span>
              <span>Book info (covers, summaries) is automatically fetched from Open Library & Google Books</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">3.</span>
              <span>Tip: Include author in task name like "Atomic Habits (James Clear)" for better matching</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">4.</span>
              <span>Add "fiction" label to tasks to categorize as fiction automatically</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border border-gray-200">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Settings className="h-4 w-4 text-gray-600" />
          </div>
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Security:</strong> Your Todoist API token is stored in environment variables, never in the browser or database. For production, use Google Secret Manager.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
