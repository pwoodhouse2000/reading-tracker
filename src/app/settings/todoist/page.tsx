'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
  const [syncResult, setSyncResult] = useState<any>(null);
  const [lastSync, setLastSync] = useState<LastSync | null>(null);
  const [autoComplete, setAutoComplete] = useState(true);
  const [configured, setConfigured] = useState(false);

  // Load projects and last sync on mount
  useEffect(() => {
    fetchProjects();
    fetchLastSync();
  }, []);

  const fetchProjects = async () => {
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

  const fetchLastSync = async () => {
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
      alert(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Todoist Integration</h1>
        <p className="text-muted-foreground mt-1">
          Sync your reading list from Todoist
        </p>
      </div>

      {/* Setup Instructions Card */}
      {!configured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Configuration Required</CardTitle>
            <CardDescription>Set up your Todoist API token to enable sync</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">To connect with Todoist, you need to configure your API token:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Todoist Settings → Integrations → Developer</a></li>
              <li>Copy your API token</li>
              <li>Add it to your <code className="bg-muted px-1 py-0.5 rounded">.env</code> file:
                <pre className="bg-muted p-2 rounded mt-1 text-xs">TODOIST_API_TOKEN="your-token-here"</pre>
              </li>
              <li>Restart the development server</li>
              <li>Refresh this page</li>
            </ol>
            <div className="pt-2">
              <Button onClick={fetchProjects} variant="outline" size="sm">
                Check Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Card */}
      {configured && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Settings</CardTitle>
            <CardDescription>
              Configure your Todoist sync preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default">Configured</Badge>
              <span className="text-muted-foreground">Todoist API token is set</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Select Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={loadingProjects}
              >
                <option value="">-- Select a project --</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Choose your "Stuff to Read" project to sync
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoComplete"
                checked={autoComplete}
                onChange={(e) => setAutoComplete(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="autoComplete" className="text-sm">
                Automatically mark Todoist tasks as complete after syncing
              </label>
            </div>

            {selectedProjectId && (
              <Button
                onClick={handleSync}
                disabled={syncing}
                className="w-full"
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Sync Result Card */}
      {syncResult && (
        <Card>
          <CardHeader>
            <CardTitle>Sync Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={syncResult.success ? 'default' : 'destructive'}>
                {syncResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            <p className="text-sm">{syncResult.message}</p>
            {syncResult.synced > 0 && (
              <p className="text-sm text-muted-foreground">
                ✓ {syncResult.synced} new {syncResult.synced === 1 ? 'book' : 'books'} added
              </p>
            )}
            {syncResult.skipped > 0 && (
              <p className="text-sm text-muted-foreground">
                → {syncResult.skipped} {syncResult.skipped === 1 ? 'book' : 'books'} already synced
              </p>
            )}
            {syncResult.errors && syncResult.errors.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-destructive">Errors:</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  {syncResult.errors.map((error: string, idx: number) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Sync Info */}
      {lastSync && (
        <Card>
          <CardHeader>
            <CardTitle>Last Sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(lastSync.lastSyncedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={lastSync.syncStatus === 'success' ? 'default' : 'destructive'}>
                  {lastSync.syncStatus}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Items Synced</p>
                <p className="font-medium">{lastSync.itemsSynced}</p>
              </div>
            </div>
            {lastSync.errorMessage && (
              <div className="mt-2">
                <p className="text-sm text-destructive">
                  Errors: {lastSync.errorMessage}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>🔒 Security Note:</strong> Your Todoist API token is stored securely in environment variables (.env file for development, Google Secret Manager for production). It is never exposed in the browser or stored in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
