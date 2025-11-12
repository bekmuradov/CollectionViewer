# CollectionViewer Plugin

A simple BrainDrive plugin built with **functional React components and hooks** that displays collections from your BrainDrive instance.

## Features

- ✅ **Modern React Functional Components** with hooks (useState, useEffect)
- ✅ **Fixed webpack configuration** with `eager: false` to properly support hooks
- ✅ **TypeScript** for type safety
- ✅ **Dark/Light theme support** built-in
- ✅ **Clean architecture** with HttpClient and Repository pattern
- ✅ **Real-time data fetching** from Collections API

## Project Structure

```
CollectionViewer/
├── src/
│   ├── CollectionViewer.tsx    # Main functional component with hooks
│   ├── CollectionViewer.css    # Styles with dark mode support
│   ├── DevStandalone.tsx       # Development wrapper (simulates host)
│   ├── HttpClient.ts           # HTTP client for API calls
│   ├── CollectionRepository.ts # Repository for collections data
│   ├── types.ts                # TypeScript interfaces
│   └── index.ts                # Production entry point
├── public/
│   ├── index.html              # Production test page
│   └── dev-index.html          # Development page template
├── dist/                       # Production build output
├── dev-dist/                   # Development build output
├── lifecycle_manager.py        # Plugin lifecycle management
├── package.json                # Dependencies
├── webpack.config.js           # Production webpack config
├── webpack.dev.js              # Development webpack config
├── tsconfig.json               # TypeScript configuration
└── README.md                   # This file
```

## Installation

### 1. Install Dependencies

```bash
cd backend/plugins/shared/CollectionViewer/v1.0.0
npm install
```

### 2. Build the Plugin

```bash
npm run build
```

This creates the `dist/` folder with `remoteEntry.js` required by BrainDrive.

### 3. Development Mode with Hot Reload ⚡

For local development with a **standalone dev server that simulates the BrainDrive host**:

```bash
npm run dev
# or
npm start
```

This will:
- Start a dev server on `http://localhost:3002`
- **Auto-open your browser**
- Load `DevStandalone.tsx` which wraps your plugin with mock services
- Enable **Hot Module Replacement** - edit files and see changes instantly!
- Provide a **theme toggle button** to test dark/light modes
- Include **mock collections data** for testing

**What you get in dev mode:**
- 🔥 Hot reload - no manual refresh needed
- 🎨 Live theme switching (light/dark)
- 📡 Mock API with sample collections data
- 🖥️ Simulated BrainDrive host environment
- 🎯 Development controls overlay
- 📊 Console logging for all service calls

## Key Fix: Webpack Configuration

This plugin includes the **critical fix** for using functional components with hooks in BrainDrive plugins:

```javascript
// webpack.config.js
shared: {
  react: {
    singleton: true,
    requiredVersion: deps.react,
    eager: false,        // ✅ FIXED: Was 'true', now 'false'
    strictVersion: false
  },
  "react-dom": {
    singleton: true,
    requiredVersion: deps["react-dom"],
    eager: false,        // ✅ FIXED: Was 'true', now 'false'
    strictVersion: false
  },
  "react/jsx-runtime": { // ✅ ADDED: JSX runtime sharing
    singleton: true,
    eager: false,
    strictVersion: false
  }
}
```

### Why This Matters

- **`eager: true`** causes plugins to load their own React instance immediately, before the host app can share its React instance
- This creates **duplicate React instances** with uninitialized hooks dispatchers
- **`eager: false`** makes plugins wait for the host's shared React instance
- This ensures **hooks work correctly** in functional components

---

## DevStandalone Architecture

The `DevStandalone.tsx` file provides a **complete development environment** that simulates the BrainDrive host system. This allows you to develop and test your plugin in isolation without needing the full BrainDrive application.

### What DevStandalone Provides

**1. Mock Services**
- **Theme Service** - Manages light/dark theme with localStorage persistence
- **API Service** - Returns mock collections data with simulated network delays
- **Settings Service** - Mock configuration management
- **Page Context Service** - Simulates page metadata

**2. Development UI**
- **Theme Toggle Button** - Switch between light/dark modes instantly
- **Hot Reload Indicator** - Visual feedback when code updates
- **Development Info Header** - Shows you're in dev mode
- **Development Notes** - Tips and instructions

**3. Host System Simulation**
- Applies `.dark` class to `<html>` element (just like the real host)
- Applies `.dark-scrollbars` class to `<body>`
- Dispatches theme change events
- Provides proper service interfaces

### How It Works

```typescript
// DevStandalone.tsx structure
DevWrapper Component
├── Mock Services Creation
│   ├── createMockThemeService()
│   ├── createMockApiService()
│   ├── createMockSettingsService()
│   └── createMockPageContextService()
├── Theme State Management
│   ├── localStorage persistence
│   ├── DOM class manipulation
│   └── Event dispatching
├── Development UI
│   ├── Theme toggle button
│   ├── Hot reload indicator
│   └── Info panels
└── Plugin Rendering
    └── <CollectionViewer services={mockServices} />
```

### Mock Collections Data

The dev server includes 9 sample collections with realistic data:
- Collection names, descriptions, colors
- Document counts
- Created/updated timestamps
- All fields matching the real API response format

### Customizing DevStandalone

You can modify `src/DevStandalone.tsx` to:
- Add more mock collections
- Change API response delays
- Add custom development controls
- Test error scenarios
- Modify theme behavior

---

## Functional Component Example

The main component demonstrates modern React patterns:

```typescript
const CollectionViewer: React.FC = () => {
  // ✅ State hooks work correctly
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Effect hook works correctly
  useEffect(() => {
    const fetchCollections = async () => {
      const httpClient = new HttpClient('http://127.0.0.1:8000');
      const collectionRepo = new CollectionRepository(httpClient);
      const data = await collectionRepo.findAll();
      setCollections(data);
    };
    fetchCollections();
  }, []);

  // Render logic...
};
```

## API Integration

The plugin fetches collections from:

```
GET http://127.0.0.1:8000/collections/
```

Response format:

```typescript
interface Collection {
  id: string;
  name: string;
  description: string;
  color: string;
  created_at: string;
  updated_at: string;
  document_count: number;
  chat_session_count?: number;
}
```

## Theme Support

The plugin automatically supports dark/light themes:

```css
/* Light theme (default) */
.collection-card {
  background: white;
  color: #333;
}

/* Dark theme */
.dark-theme .collection-card {
  background: #1e1e1e;
  color: #e0e0e0;
}
```

## Lifecycle Manager

The `lifecycle_manager.py` handles:
- Plugin installation per user
- Database record creation
- File management
- Health checks
- Uninstallation

## Testing

### Standalone Test

1. Build the plugin: `npm run build`
2. Open `public/index.html` in a browser
3. The component should load and fetch collections

### In BrainDrive

1. Build the plugin
2. Install via Plugin Manager
3. Add to a page from the toolbox

## Troubleshooting

### "Invalid hook call" Error

If you see this error, it means `eager: true` is set in webpack.config.js. Verify:

```javascript
// Should be false, not true
eager: false
```

### Module Not Found

Make sure all dependencies are installed:

```bash
npm install
```

### Build Fails

Clean and rebuild:

```bash
npm run clean
npm install
npm run build
```

## Credits

Built as a demonstration of functional React components with hooks in BrainDrive plugins, with the critical webpack configuration fix.

## License

MIT
