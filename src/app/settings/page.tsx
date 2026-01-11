import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure integrations and manage your reading tracker
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Todoist Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Todoist Integration</CardTitle>
            <CardDescription>
              Sync your reading list from Todoist
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Automatically import books from your "Stuff to Read" Todoist project and mark tasks as complete after syncing.
            </p>
            <Link href="/settings/todoist">
              <Button className="w-full">
                Configure Todoist
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notion Integration */}
        <Card>
          <CardHeader>
            <CardTitle>Notion Import</CardTitle>
            <CardDescription>
              One-time import from Notion database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Import your existing reading list from a Notion database. Books already imported will be automatically skipped.
            </p>
            <Link href="/settings/notion">
              <Button className="w-full">
                Configure Notion
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Security Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>🔒 Security Note:</strong> All API tokens are stored securely in environment variables (.env file for development, Google Secret Manager for production). Tokens are never exposed in the browser or stored in the database.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
