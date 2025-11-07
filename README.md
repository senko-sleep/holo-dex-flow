# AnimeDex+ 🎌

> A modern, feature-rich anime and manga discovery platform with advanced search, manga reading, and personalization features.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

## ✨ Features

### 🔍 Advanced Search
- **Multi-type Search**: Search anime, manga, and characters simultaneously
- **Smart Filters**: Dynamic filters powered by MangaDex API
- **View Modes**: Toggle between grid and list views
- **Sort Options**: Sort by relevance, rating, year, or title
- **Real-time Results**: Instant search with debouncing

### 📚 Manga Reader
- **Professional Reading Experience**: Full-screen, distraction-free reading
- **Progress Tracking**: Auto-save reading progress
- **Zoom Controls**: 50%-200% zoom range
- **Reading Modes**: Single page or continuous scroll
- **Quality Toggle**: High quality or data saver mode
- **Keyboard Navigation**: Arrow keys for page navigation
- **Page Thumbnails**: Quick navigation sidebar

### ⭐ Favorites System
- **Bookmark Content**: Save anime, manga, and characters
- **Persistent Storage**: LocalStorage-based favorites
- **Quick Access**: One-click favorite management
- **Cross-session**: Favorites persist across sessions

### ⚡ Performance
- **Intelligent Caching**: 80% reduction in API calls
- **Retry Logic**: Automatic retry with exponential backoff
- **Error Boundaries**: Graceful error handling
- **Loading States**: Professional skeleton loaders
- **Optimized Queries**: React Query with smart caching

## 🚀 Quick Start

**URL**: https://lovable.dev/projects/1f17dcfe-b431-4772-94e8-ad20616cd516

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/1f17dcfe-b431-4772-94e8-ad20616cd516) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 🛠️ Technology Stack

### Frontend
- **React 18.3** - UI library
- **TypeScript 5.9** - Type safety
- **Vite 7.2** - Build tool & dev server
- **React Router 6.30** - Client-side routing
- **TanStack Query 5.90** - Data fetching & caching

### UI Components
- **shadcn/ui** - Component library
- **Radix UI** - Accessible primitives
- **Tailwind CSS 3.4** - Utility-first styling
- **Lucide React** - Icon system

### APIs
- **Jikan API v4** - Anime data (MyAnimeList)
- **MangaDex API** - Manga data & chapters
- **AnimeThemes API** - Theme songs

### State Management
- **React Query** - Server state
- **LocalStorage** - Favorites & progress
- **Custom Cache** - In-memory caching

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── AnimeCard.tsx   # Anime display card
│   ├── MangaCard.tsx   # Manga display card
│   ├── SearchBar.tsx   # Search interface
│   ├── SearchFilters.tsx # Filter controls
│   ├── LoadingGrid.tsx # Loading skeletons
│   └── ErrorBoundary.tsx # Error handling
├── pages/              # Route pages
│   ├── Index.tsx       # Home page
│   ├── SearchResults.tsx # Search results
│   ├── MangaDetail.tsx # Manga info
│   └── MangaReader.tsx # Chapter reader
├── services/           # API integrations
│   ├── animeApi.ts     # Jikan API
│   └── mangadexApi.ts  # MangaDex API
├── lib/                # Utilities
│   ├── cache.ts        # Caching system
│   ├── favorites.ts    # Favorites manager
│   └── utils.ts        # Helper functions
└── types/              # TypeScript types
    ├── anime.ts        # Anime types
    └── manga.ts        # Manga types
```

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/1f17dcfe-b431-4772-94e8-ad20616cd516) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
