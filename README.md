# Reading Tracker

A professional web application to track your reading journey, built with Next.js, Prisma, and SQLite.

## Features Implemented

### ✅ Phase 1: Core Features

**Complete CRUD Operations**
- Add, view, edit, and delete books
- Track title, author, media type (paper/audiobook/e-book), category, and more
- Add personal thoughts and summaries

**Status Management**
- Track reading status: To Read, Next Up, Reading, Paused, Finished
- Automatic date tracking (start date when status changes to "Reading", finish date when "Finished")

**Rich Book Data**
- Store book summaries
- Add personal thoughts and notes
- Rate books with 1-5 stars
- Categorize as Fiction or Non-Fiction with custom sub-categories

**Professional UI**
- Clean, modern design with shadcn/ui components
- Responsive layout for mobile, tablet, and desktop
- Status badges and visual indicators
- Book cards with cover image support

**Dashboard**
- Real-time statistics (currently reading, to read, finished this year, total books)
- Recently added books display
- Quick access to add new books

### ✅ Phase 2: Book API Integration

**Automated Book Information**
- Search Open Library and Google Books APIs
- Auto-populate book details (title, author, summary, cover images)
- Intelligent fallback between API providers
- Manual override capability for all fields

### ✅ Phase 3: Reporting & Analytics

**Comprehensive Reports**
- Best books by year and category
- Reading statistics and trends
- Monthly reading charts
- Fiction vs Non-Fiction breakdowns
- Media type analysis

### ✅ Phase 4: Todoist Integration

**Secure Todoist Sync**
- Auto-sync from "Stuff to Read" Todoist project
- Automatically create book entries from tasks
- Mark Todoist tasks as complete after syncing
- Secure token management via environment variables
- Track sync history and status

### ✅ Phase 5: Notion Import

**One-Time Notion Import**
- Import reading list from Notion database
- Smart field mapping (Name, Author, Status, Media, Category, etc.)
- Automatic duplicate detection and skipping
- Support for multiple Status values (To Read, Reading, Next Up, Finished, Paused, Wish List)
- Media type detection (Audible → Audiobook, Kindle → Ebook, blank → Paper)
- Priority mapping and sub-category support
- Secure token management via environment variables

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

Create a `.env` file in the root directory (see `.env.example` for template):

```env
# Database Configuration
# For local development, use SQLite
DATABASE_URL="file:./dev.db"

# For production with Turso (distributed SQLite):
# TURSO_DATABASE_URL="libsql://your-database-name.turso.io"
# TURSO_AUTH_TOKEN="your-turso-auth-token"

# API Keys (optional)
# GOOGLE_BOOKS_API_KEY="your-google-books-api-key"

# Todoist Integration
# Get your API token from: https://todoist.com/app/settings/integrations/developer
TODOIST_API_TOKEN=""
# Your "Stuff to Read" project ID (get from Todoist URL or leave empty to select in UI)
TODOIST_PROJECT_ID=""

# Notion Integration (for Phase 5)
# NOTION_API_TOKEN=""
# NOTION_DATABASE_ID=""
```

### Setting up Todoist Integration

1. Go to [Todoist Settings → Integrations → Developer](https://todoist.com/app/settings/integrations/developer)
2. Copy your API token
3. Add it to your `.env` file as `TODOIST_API_TOKEN="your-token-here"`
4. Restart the development server
5. Navigate to Settings → Todoist in the app
6. Select your "Stuff to Read" project and sync

### Setting up Notion Import

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration" and give it a name (e.g., "Reading Tracker")
3. Copy the "Internal Integration Token"
4. Share your reading list database with the integration:
   - Open your reading list database in Notion
   - Click "..." → "Add connections"
   - Select your integration
5. Add the token to your `.env` file as `NOTION_API_TOKEN="your-token-here"`
6. Restart the development server
7. Navigate to Settings → Notion in the app
8. Select your reading list database and import

## Security

### API Token Management

This application follows security best practices for managing sensitive credentials:

**Development Environment:**
- API tokens (Todoist, Notion) are stored in the `.env` file
- The `.env` file is excluded from version control via `.gitignore`
- Tokens are never exposed to the browser or client-side code
- All API calls use server-side routes that read from `process.env`

**Production Environment (Google Cloud):**
- API tokens will be stored in Google Secret Manager
- Environment variables will be injected securely at runtime
- No credentials are stored in the application code or database

**What This Means:**
- ✅ Your tokens are never transmitted to the browser
- ✅ Tokens cannot be accessed by client-side JavaScript
- ✅ Each developer/environment has its own isolated credentials
- ✅ Tokens are not committed to Git repositories

**Important:** Never paste API tokens into web forms or client-side code. This application is designed to only accept tokens through environment variables or secure secret management systems.

## Next Steps (Upcoming Phases)

### Phase 6: Deployment
- Deploy to Google Cloud Run
- Configure Turso for production database
- Integrate Google Secret Manager for production credentials
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
