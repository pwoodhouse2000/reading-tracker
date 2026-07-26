# Pete's Reading Tracker

A personal reading tracker web application with AI-powered recommendations, built with Next.js, Prisma, and deployed on Google Cloud Run.

**Live App**: [reading-tracker-oevxqjjziq-uw.a.run.app](https://reading-tracker-oevxqjjziq-uw.a.run.app)

## Features

### 📚 Core Reading Management
- **Full CRUD operations** for books with title, author, media type, category, status
- **Status tracking**: To Read → Next Up → Reading → Paused → Finished
- **Smart date tracking**: Automatic start/finish dates based on status changes
- **Ratings & Reviews**: 1-5 star ratings with personal thoughts
- **Categories**: Fiction/Non-Fiction with custom sub-categories
- **Priority management**: Drag-and-drop reordering for to-read lists

### 🔍 Book Discovery
- **API Integration**: Search Open Library and Google Books for book details
- **Auto-populate**: Cover images, summaries, ISBNs automatically fetched
- **Manual override**: Full control over all book information

### 📊 Analytics & Reports
- **Dashboard**: Real-time reading statistics and progress
- **Year in Review**: Comprehensive annual reading summary
- **Monthly charts**: Visual reading activity over time
- **Category breakdowns**: Fiction vs Non-Fiction analysis
- **Reading velocity**: Track books per month with year-over-year comparison

### 🎯 Reading Goals
- **Annual goals**: Set and track yearly reading targets
- **Progress tracking**: Visual progress rings and projections
- **On-track indicators**: Know if you'll hit your goal at current pace

### 📝 Notes & Quotes
- **Per-book notes**: Add notes with optional page references
- **Notes search**: Find across all your book notes
- **Dedicated notes page**: Browse and search all annotations

### 🤖 AI Features (Powered by OpenAI)
- **Smart Recommendations**: Personalized book suggestions based on your reading history
- **Reading Chat**: Ask questions about your library, stats, and patterns
- **Context-aware**: AI knows your ratings, favorites, and reading velocity

### 🔗 Integrations
- **Todoist Sync**: Auto-import from your "Stuff to Read" project
- **Notion Import**: One-time import from Notion reading databases

### 📱 Modern Experience
- **Dark Mode**: Full dark/light theme support with system preference detection
- **PWA Support**: Install as an app on mobile devices
- **Embeddable Widget**: Share your currently reading on blogs/websites
- **Responsive Design**: Works beautifully on all screen sizes

### 🔐 Security
- **Admin Authentication**: Password-protected editing features
- **Public Viewing**: Anyone can browse your reading stats
- **Secure Secrets**: All API keys stored in Google Secret Manager

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Prisma** | Database ORM |
| **Turso** | Distributed SQLite (production) |
| **SQLite** | Local development database |
| **Tailwind CSS** | Styling |
| **shadcn/ui** | UI components |
| **OpenAI GPT-4o-mini** | AI recommendations & chat |
| **Google Cloud Run** | Production hosting |
| **Google Secret Manager** | Secure credential storage |

## Local Development

### Prerequisites
- Node.js 20+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/pwoodhouse2000/reading-tracker.git
cd reading-tracker

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

Create a `.env` file:

```env
# Database (local development)
DATABASE_URL="file:./dev.db"

# Admin password for editing
ADMIN_PASSWORD="your-secure-password"

# Optional separate secret for signing admin sessions
AUTH_SECRET="generate-a-long-random-value"

# Optional: Todoist integration
TODOIST_API_TOKEN=""

# Optional: Notion import
NOTION_API_TOKEN=""
NOTION_DATABASE_ID=""

# Optional: AI features
OPENAI_API_KEY=""

# Optional: Google Books API (for better book search)
GOOGLE_BOOKS_API_KEY=""
```

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npx prisma studio    # Open database GUI
npx prisma migrate dev  # Create new migration
```

## Production Deployment

The app is deployed on Google Cloud Run with:

- **Turso** for distributed SQLite database
- **Google Secret Manager** for secure credential storage
- **Cloud Build** for CI/CD

### Secrets Required

| Secret Name | Description |
|-------------|-------------|
| `TURSO_DATABASE_URL` | Turso database URL |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `ADMIN_PASSWORD` | Admin login password |
| `AUTH_SECRET` | Optional independent secret for signed admin sessions |
| `TODOIST_API_TOKEN` | Todoist API token |
| `NOTION_API_TOKEN` | Notion integration token |
| `NOTION_DATABASE_ID` | Notion database ID |
| `OPENAI_API_KEY` | OpenAI API key for AI features |

### Deploy

```bash
# Push changes
git push origin main

# Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml
```

## Project Structure

```
reading-tracker/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── icons/                 # App icons
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── ai/            # AI endpoints
│   │   │   ├── books/         # Book CRUD
│   │   │   ├── goals/         # Reading goals
│   │   │   ├── notes/         # Notes CRUD
│   │   │   └── ...
│   │   ├── books/             # Book pages
│   │   ├── discover/          # AI recommendations
│   │   ├── embed/             # Embeddable widget
│   │   ├── notes/             # Notes page
│   │   ├── reports/           # Analytics
│   │   ├── settings/          # Settings pages
│   │   └── ...
│   ├── components/
│   │   ├── ai/                # AI components
│   │   ├── auth/              # Authentication
│   │   ├── books/             # Book components
│   │   ├── notes/             # Notes components
│   │   ├── pwa/               # PWA components
│   │   ├── stats/             # Statistics components
│   │   ├── theme/             # Theme toggle
│   │   └── ui/                # Base UI components
│   ├── lib/
│   │   ├── services/          # Business logic
│   │   ├── prisma.ts          # Database client
│   │   └── auth.ts            # Authentication
│   └── styles/
│       └── globals.css        # Global styles
├── __tests__/                 # Test files
├── cloudbuild.yaml            # Cloud Build config
├── Dockerfile                 # Container config
└── package.json
```

## Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## API Reference

### Books
- `GET /api/books` - List all books
- `POST /api/books` - Create book (auth required)
- `GET /api/books/[id]` - Get single book
- `PATCH /api/books/[id]` - Update book (auth required)
- `DELETE /api/books/[id]` - Delete book (auth required)
- `GET /api/books/search?q=` - Search books by title/author

### Notes
- `GET /api/notes?bookId=` - List notes
- `POST /api/notes` - Create note (auth required)
- `PATCH /api/notes/[id]` - Update note (auth required)
- `DELETE /api/notes/[id]` - Delete note (auth required)

### Goals & Stats
- `GET /api/goals?year=` - Get reading goal
- `POST /api/goals` - Set goal (auth required)
- `GET /api/stats?year=` - Get reading statistics

### AI
- `GET /api/ai/recommendations` - Get AI book recommendations
- `POST /api/ai/chat` - Chat about reading history

### Embed
- `GET /api/embed?status=&limit=` - Get books for embedding

## License

Private project - All rights reserved

## Author

Pete Woodhouse
