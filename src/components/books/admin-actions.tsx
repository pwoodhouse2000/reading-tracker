'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AdminOnly } from '@/components/auth/admin-only';
import { Edit, Plus, Download } from 'lucide-react';

interface BookEditButtonProps {
  bookId: string;
}

export function BookEditButton({ bookId }: BookEditButtonProps) {
  return (
    <AdminOnly>
      <Link href={`/books/${bookId}/edit`}>
        <Button className="gap-2 shadow-lg shadow-primary/25">
          <Edit className="h-4 w-4" />
          Edit Book
        </Button>
      </Link>
    </AdminOnly>
  );
}

export function BookAddButton() {
  return (
    <AdminOnly>
      <Link href="/books/new">
        <Button className="rounded-xl shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </Link>
    </AdminOnly>
  );
}

export function BookAddButtonLarge() {
  return (
    <AdminOnly>
      <Link href="/books/new">
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
          <Plus className="h-5 w-5 mr-2" />
          Add Book
        </Button>
      </Link>
    </AdminOnly>
  );
}

export function TodoistImportButton() {
  return (
    <AdminOnly>
      <Link href="/settings/todoist">
        <Button variant="outline" className="rounded-xl border-2">
          <Download className="h-4 w-4 mr-2" />
          Import from Todoist
        </Button>
      </Link>
    </AdminOnly>
  );
}

interface AddDetailsButtonProps {
  bookId: string;
}

export function AddDetailsButton({ bookId }: AddDetailsButtonProps) {
  return (
    <AdminOnly>
      <Link href={`/books/${bookId}/edit`}>
        <Button variant="outline" size="sm" className="border-2">
          <Edit className="h-4 w-4 mr-2" />
          Add Details
        </Button>
      </Link>
    </AdminOnly>
  );
}

export function EmptyStateAddButton() {
  return (
    <AdminOnly>
      <Link href="/books/new">
        <Button size="lg" className="rounded-xl shadow-lg shadow-primary/25">
          <Plus className="h-5 w-5 mr-2" />
          Add Your First Book
        </Button>
      </Link>
    </AdminOnly>
  );
}
