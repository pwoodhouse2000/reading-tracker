import { Suspense } from 'react';
import '../../styles/globals.css';

export const metadata = {
  title: 'Reading Widget',
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-transparent m-0 p-0">
        <Suspense fallback={<div className="p-4 text-gray-500">Loading...</div>}>
          {children}
        </Suspense>
      </body>
    </html>
  );
}
