# Reading Tracker

A professional web application to track your reading journey, built with Next.js, Prisma, and SQLite.

## Features Implemented (Phase 1 - Core Features)

### ✅ Complete CRUD Operations
- Add, view, edit, and delete books
- Track title, author, media type (paper/audiobook/e-book), category, and more
- Add personal thoughts and summaries

### ✅ Status Management
- Track reading status: To Read, Next Up, Reading, Paused, Finished
- Automatic date tracking (start date when status changes to "Reading", finish date when "Finished")

### ✅ Rich Book Data
- Store book summaries
- Add personal thoughts and notes
- Rate books with 1-5 stars
- Categorize as Fiction or Non-Fiction with custom sub-categories

### ✅ Professional UI
- Clean, modern design with shadcn/ui components
- Responsive layout for mobile, tablet, and desktop
- Status badges and visual indicators
- Book cards with cover image support

### ✅ Dashboard
- Real-time statistics (currently reading, to read, finished this year, total books)
- Recently added books display
- Quick access to add new books

## Getting Started

### Prerequisites
- Node.js 20+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd reading-tracker
```

2. Install dependencies (if not already done):
```bash
npm install
```

3. The database is already set up with Prisma. If you need to reset it:
```bash
npx prisma migrate reset
```

### Running the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
reading-tracker/
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── migrations/             # Migration files
│   └── dev.db                  # SQLite database (local)
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/books/          # API routes for CRUD operations
│   │   ├── books/              # Book pages (list, detail, add, edit)
│   │   ├── layout.tsx          # Root layout with navigation
│   │   └── page.tsx            # Dashboard homepage
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components (Button, Card, Badge)
│   │   └── books/              # Book-specific components
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client setup
│   │   ├── db.ts               # Database configuration
│   │   └── utils.ts            # Utility functions
│   └── styles/
│       └── globals.css         # Global styles and Tailwind
└── .env                        # Environment variables

```

## Database Schema

The application uses Prisma with SQLite (local) and supports Turso for production deployment.

### Main Models:
- **Book**: Core book data with status, ratings, dates, and metadata
- **Note**: Separate notes associated with books
- **TodoistSync**: Tracks Todoist sync operations (for future integration)
- **NotionImport**: Records Notion imports (for future integration)

## Environment Variables

Create a `.env` file in the root directory:

```env
# For local development
DATABASE_URL="file:./dev.db"

# For production with Turso (optional)
# TURSO_DATABASE_URL="libsql://your-database.turso.io"
# TURSO_AUTH_TOKEN="your-token"

# Optional API keys for future features
# GOOGLE_BOOKS_API_KEY="your-key"
```

## Next Steps (Future Phases)

### Phase 2: Book API Integration
- Auto-populate book details from Open Library and Google Books APIs
- Search books when adding new entries
- Auto-fill title, author, summary, and cover images

### Phase 3: Reporting & Analytics
- Generate reports on reading history
- View best books by year and category
- Monthly reading statistics and charts

### Phase 4: Todoist Integration
- Sync from "Stuff to Read" Todoist project
- Automatically create book entries
- Mark Todoist tasks as complete after sync

### Phase 5: Notion Import
- One-time import from existing Notion database
- Map Notion fields to app structure

### Phase 6: Deployment
- Deploy to Google Cloud Run
- Configure Turso for production database
- Set up CI/CD pipeline

## Tech Stack

- **Frontend**: Next.js 16 (React) with App Router
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Database**: Prisma + SQLite (local) / Turso (production)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with CSS variables

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npx prisma studio` - Open Prisma Studio to view/edit database
- `npx prisma migrate dev` - Create new migration
- `npx prisma generate` - Regenerate Prisma Client

## License

Private project

## Support

For questions or issues, please refer to the implementation plan at `.claude/plans/compiled-greeting-naur.md`
