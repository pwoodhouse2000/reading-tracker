import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileText, Shield, ChevronRight, Sparkles, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Configure integrations and manage your reading tracker
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Todoist Integration */}
        <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-red-500 to-red-600 rounded-xl text-white shadow-lg">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Todoist Integration</CardTitle>
                <CardDescription className="text-sm">
                  Auto-sync from your reading list
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Auto-fetch book covers & summaries</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Smart title/author parsing</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span>Mark tasks complete after sync</span>
              </div>
            </div>
            <Link href="/settings/todoist">
              <Button className="w-full group-hover:shadow-lg shadow-primary/25 transition-all">
                Configure Todoist
                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notion Integration */}
        <Card className="group border-0 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl text-white shadow-lg">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-xl">Notion Import</CardTitle>
                <CardDescription className="text-sm">
                  One-time import from Notion
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4 text-gray-500" />
                <span>Import from any Notion database</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4 text-gray-500" />
                <span>Smart field mapping</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4 text-gray-500" />
                <span>Skip already imported books</span>
              </div>
            </div>
            <Link href="/settings/notion">
              <Button variant="outline" className="w-full border-2 hover:bg-gray-50">
                Configure Notion
                <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Security Information */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50/80 to-indigo-50/80">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-2.5 bg-blue-100 rounded-xl">
            <Shield className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Security Note</h3>
            <p className="text-sm text-blue-800/80 leading-relaxed">
              All API tokens are stored securely in environment variables (.env file for development, 
              Google Secret Manager for production). Tokens are never exposed in the browser or stored in the database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
