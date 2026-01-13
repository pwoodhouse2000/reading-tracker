'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Code2, 
  Copy, 
  Check, 
  ExternalLink,
  Palette,
  BookOpen,
  ListOrdered,
  Star
} from 'lucide-react';

type Theme = 'light' | 'dark' | 'transparent' | 'gradient';
type Status = 'READING' | 'NEXT_UP' | 'FINISHED';

const themes: { value: Theme; label: string; preview: string }[] = [
  { value: 'light', label: 'Light', preview: 'bg-white border-gray-200' },
  { value: 'dark', label: 'Dark', preview: 'bg-gray-900 border-gray-700' },
  { value: 'transparent', label: 'Transparent', preview: 'bg-transparent border-gray-300' },
  { value: 'gradient', label: 'Gradient', preview: 'bg-gradient-to-br from-violet-500 to-purple-600 border-violet-400' },
];

const statuses: { value: Status; label: string }[] = [
  { value: 'READING', label: 'Currently Reading' },
  { value: 'NEXT_UP', label: 'Up Next' },
  { value: 'FINISHED', label: 'Recently Finished' },
];

export default function WidgetSettingsPage() {
  const [theme, setTheme] = useState<Theme>('light');
  const [status, setStatus] = useState<Status>('READING');
  const [limit, setLimit] = useState(3);
  const [showRating, setShowRating] = useState(true);
  const [compact, setCompact] = useState(false);
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const embedUrl = `${baseUrl}/embed/reading?theme=${theme}&status=${status}&limit=${limit}&rating=${showRating}&compact=${compact}`;

  const iframeCode = `<iframe 
  src="${embedUrl}"
  width="320"
  height="${compact ? 150 + (limit * 50) : 180 + (limit * 70)}"
  frameborder="0"
  style="border-radius: 12px; overflow: hidden;"
></iframe>`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(iframeCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Embed Widget</h1>
        <p className="text-muted-foreground mt-1">
          Share what you're reading on your blog, website, or social profiles
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <div className="space-y-6">
          {/* Theme Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5" />
                Theme
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`p-4 rounded-xl border-2 transition-all ${t.preview} ${
                      theme === t.value 
                        ? 'ring-2 ring-primary ring-offset-2' 
                        : 'hover:scale-105'
                    }`}
                  >
                    <span className={`text-sm font-medium ${
                      t.value === 'dark' || t.value === 'gradient' ? 'text-white' : 'text-gray-900'
                    }`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Status Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Display
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Show books with status
                </label>
                <div className="flex flex-wrap gap-2">
                  {statuses.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        status === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Number of books
                </label>
                <div className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={limit}
                    onChange={(e) => setLimit(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-center font-medium">{limit}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showRating}
                  onChange={(e) => setShowRating(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Show ratings (for finished books)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={compact}
                  onChange={(e) => setCompact(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Compact mode</span>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Code */}
        <div className="space-y-6">
          {/* Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Preview</span>
                <a
                  href={embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-normal text-primary hover:underline flex items-center gap-1"
                >
                  Open in new tab
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
                <iframe
                  src={embedUrl}
                  width="320"
                  height={compact ? 150 + (limit * 50) : 180 + (limit * 70)}
                  frameBorder="0"
                  style={{ borderRadius: '12px', overflow: 'hidden' }}
                  title="Widget Preview"
                />
              </div>
            </CardContent>
          </Card>

          {/* Embed Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5" />
                Embed Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs overflow-x-auto">
                  <code>{iframeCode}</code>
                </pre>
                <Button
                  size="sm"
                  onClick={handleCopy}
                  className="absolute top-2 right-2"
                  variant={copied ? 'default' : 'secondary'}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                Paste this code into your website's HTML to display the widget.
              </p>
            </CardContent>
          </Card>

          {/* Direct Link */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Direct Link</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={embedUrl}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(embedUrl);
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Use this URL to link directly to your reading widget.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
