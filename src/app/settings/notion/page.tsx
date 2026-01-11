'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface Database {
  id: string;
  name: string;
}

interface LastImport {
  id: string;
  importedAt: string;
  itemsImported: number;
  status: string;
  errorDetails: string | null;
}

export default function NotionSettingsPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState('');
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [lastImport, setLastImport] = useState<LastImport | null>(null);
  const [configured, setConfigured] = useState(false);

  // Load databases and last import on mount
  useEffect(() => {
    fetchDatabases();
    fetchLastImport();
  }, []);

  const fetchDatabases = async () => {
    setLoadingDatabases(true);
    try {
      const response = await fetch('/api/notion/databases');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch databases');
      }

      setDatabases(data.databases);
      setConfigured(true);
    } catch (error) {
      console.error('Error fetching databases:', error);
      setConfigured(false);
    } finally {
      setLoadingDatabases(false);
    }
  };

  const fetchLastImport = async () => {
    try {
      const response = await fetch('/api/notion/import');
      const data = await response.json();
      if (data.lastImport) {
        setLastImport(data.lastImport);
      }
    } catch (error) {
      console.error('Error fetching last import:', error);
    }
  };

  const handleImport = async () => {
    if (!selectedDatabaseId) {
      alert('Please select a database first');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/notion/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          databaseId: selectedDatabaseId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Import failed');
      }

      setImportResult(data);
      fetchLastImport();
    } catch (error) {
      console.error('Error importing:', error);
      alert(error instanceof Error ? error.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Notion Import</h1>
        <p className="text-muted-foreground mt-1">
          One-time import of your reading list from Notion
        </p>
      </div>

      {/* Setup Instructions Card */}
      {!configured && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle>Configuration Required</CardTitle>
            <CardDescription>Set up your Notion integration to enable import</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">To import from Notion, you need to configure your integration token:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Notion Integrations</a></li>
              <li>Click "New integration" and give it a name (e.g., "Reading Tracker")</li>
              <li>Copy the "Internal Integration Token"</li>
              <li>Share your reading list database with the integration:
                <ul className="list-disc list-inside ml-4 mt-1">
                  <li>Open your reading list database in Notion</li>
                  <li>Click "..." → "Add connections"</li>
                  <li>Select your integration</li>
                </ul>
              </li>
              <li>Add the token to your <code className="bg-muted px-1 py-0.5 rounded">.env</code> file:
                <pre className="bg-muted p-2 rounded mt-1 text-xs">NOTION_API_TOKEN="your-token-here"</pre>
              </li>
              <li>Restart the development server</li>
              <li>Refresh this page</li>
            </ol>
            <div className="pt-2">
              <Button onClick={fetchDatabases} variant="outline" size="sm">
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
            <CardTitle>Import Settings</CardTitle>
            <CardDescription>
              Select your reading list database to import
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="default">Configured</Badge>
              <span className="text-muted-foreground">Notion integration token is set</span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Database ID
              </label>
              <input
                type="text"
                value={selectedDatabaseId}
                onChange={(e) => setSelectedDatabaseId(e.target.value)}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                placeholder="Paste your database ID here"
              />
              <p className="text-xs text-muted-foreground mt-1">
                To get your database ID: Open "Pete's Reading List" in Notion, copy the URL. The database ID is the part after the last slash and before the "?" (32 characters, letters and numbers).
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example URL: https://www.notion.so/myworkspace/<strong>abc123def456...</strong>?v=...
              </p>
            </div>

            {selectedDatabaseId && (
              <div className="space-y-2">
                <Button
                  onClick={handleImport}
                  disabled={importing}
                  className="w-full"
                >
                  {importing ? 'Importing...' : 'Import from Notion'}
                </Button>
                <p className="text-xs text-muted-foreground">
                  This will import all books from the selected database. Books already imported will be skipped.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import Result Card */}
      {importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Import Result</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant={importResult.success ? 'default' : 'destructive'}>
                {importResult.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
            <p className="text-sm">{importResult.message}</p>
            {importResult.itemsImported > 0 && (
              <p className="text-sm text-muted-foreground">
                ✓ {importResult.itemsImported} new {importResult.itemsImported === 1 ? 'book' : 'books'} imported
              </p>
            )}
            {importResult.skipped > 0 && (
              <p className="text-sm text-muted-foreground">
                → {importResult.skipped} {importResult.skipped === 1 ? 'book' : 'books'} already imported (skipped)
              </p>
            )}
            {importResult.totalFound > 0 && (
              <p className="text-sm text-muted-foreground">
                Total books found in Notion: {importResult.totalFound}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Last Import Info */}
      {lastImport && (
        <Card>
          <CardHeader>
            <CardTitle>Last Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {new Date(lastImport.importedAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={lastImport.status === 'success' ? 'default' : 'destructive'}>
                  {lastImport.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Items Imported</p>
                <p className="font-medium">{lastImport.itemsImported}</p>
              </div>
            </div>
            {lastImport.errorDetails && (
              <div className="mt-2">
                <p className="text-sm text-destructive">
                  Error: {lastImport.errorDetails}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm text-blue-900">
            <strong>ℹ️ About Notion Import:</strong>
          </p>
          <ul className="text-sm text-blue-900 space-y-1 list-disc list-inside">
            <li>This is a one-time import from your existing Notion database</li>
            <li>Books already imported will be automatically skipped</li>
            <li>The following fields will be imported: Name, Author, Status, Media, Category, Sub-Category, Priority, Rating, Date Finished</li>
            <li>You can run the import multiple times if you add more books to Notion</li>
            <li>After import, you can edit and manage all books directly in this app</li>
          </ul>
        </CardContent>
      </Card>

      {/* Security Note */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>🔒 Security Note:</strong> Your Notion integration token is stored securely in environment variables (.env file for development, Google Secret Manager for production). It is never exposed in the browser or stored in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
