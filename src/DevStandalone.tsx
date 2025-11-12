/**
 * DevStandalone.tsx
 *
 * Development wrapper for CollectionViewer plugin that simulates the BrainDrive host system.
 * Provides mock services, theme switching, and hot module replacement for local development.
 */

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import CollectionViewer from './CollectionViewer';
import './CollectionViewer.css';

// ============================================================================
// Hot Module Replacement (HMR) Setup
// ============================================================================

if (module.hot) {
  console.log('🔥 Hot Module Replacement is enabled');

  module.hot.addStatusHandler((status) => {
    if (status === 'apply') {
      const indicator = document.querySelector('.hot-reload-indicator');
      if (indicator) {
        (indicator as HTMLElement).style.background = '#ffa500';
        indicator.textContent = '🔄 Reloading...';
        setTimeout(() => {
          (indicator as HTMLElement).style.background = '#00d4aa';
          indicator.textContent = '🔥 Hot Reload Active';
        }, 1000);
      }
    }
  });
}

// ============================================================================
// Type Definitions
// ============================================================================

type Theme = 'light' | 'dark';

interface ThemeService {
  getCurrentTheme: () => Theme;
  addThemeChangeListener: (listener: (theme: Theme) => void) => void;
  removeThemeChangeListener: (listener: (theme: Theme) => void) => void;
}

interface ApiService {
  get: <T = any>(url: string) => Promise<T>;
  post: <T = any>(url: string, data?: any) => Promise<T>;
  put: <T = any>(url: string, data?: any) => Promise<T>;
  delete: <T = any>(url: string) => Promise<T>;
}

interface SettingsService {
  getSetting: (key: string) => Promise<any>;
  setSetting: (key: string, value: any) => Promise<void>;
  getSettingDefinitions: () => Promise<any>;
}

interface PageContextService {
  getCurrentPageContext: () => {
    pageId: string;
    pageName: string;
    pageRoute: string;
    isStudioPage: boolean;
  };
  onPageContextChange: (handler: (context: any) => void) => () => void;
}

interface Services {
  theme?: ThemeService;
  api?: ApiService;
  settings?: SettingsService;
  pageContext?: PageContextService;
}

// ============================================================================
// Mock Collections Data
// ============================================================================

const mockCollections = [
  {
    id: "eval-test-collection-00000000-0000-0000-0000-000000000001",
    name: "evaluation_test_collection",
    description: "Evaluation test collection with sample documents for testing RAG system accuracy",
    color: "#FF6B6B",
    created_at: "2025-11-04T09:54:12.771020",
    updated_at: "2025-11-04T09:54:12.771020",
    document_count: 2
  },
  {
    id: "d462e2c5-4f3a-4815-b847-5cdf34e6dd2c",
    name: "Movies list",
    description: "my movies list recommendations",
    color: "#f73b3b",
    created_at: "2025-10-28T10:29:28.038862",
    updated_at: "2025-10-28T10:31:04.511371",
    document_count: 1
  },
  {
    id: "48a8de38-e714-40ad-9744-c5c1b73f9c9f",
    name: "Test different files",
    description: "different files",
    color: "#f7b23b",
    created_at: "2025-10-22T13:02:10.820346",
    updated_at: "2025-10-22T14:12:56.703811",
    document_count: 2
  },
  {
    id: "71301135-654f-494a-bef3-aebe1f84aa65",
    name: "Docling BrainDrive",
    description: "test",
    color: "#3b82f6",
    created_at: "2025-10-22T09:26:14.351602",
    updated_at: "2025-10-22T11:27:00.838202",
    document_count: 2
  },
  {
    id: "4a2fdbbd-77ad-4623-a7ed-12fddcaeedbc",
    name: "Docling Zito",
    description: "test docling zito media",
    color: "#2615a2",
    created_at: "2025-10-20T15:18:42.312338",
    updated_at: "2025-10-22T08:39:59.256527",
    document_count: 2
  },
  {
    id: "11148606-562a-42ff-bfe7-51a14340e1e6",
    name: "Docling test",
    description: "test",
    color: "#f73ba9",
    created_at: "2025-10-20T15:01:47.122723",
    updated_at: "2025-10-20T15:10:04.950013",
    document_count: 2
  },
  {
    id: "f84ced94-d513-464f-93df-aee5312aa098",
    name: "David's Files",
    description: "test",
    color: "#f79f3b",
    created_at: "2025-09-29T14:25:24.348818",
    updated_at: "2025-09-29T14:28:39.911727",
    document_count: 2
  },
  {
    id: "af59745b-f416-420c-8796-aa07c889dbcb",
    name: "David Waring Collection",
    description: "test",
    color: "#f7a93b",
    created_at: "2025-09-29T14:15:15.210266",
    updated_at: "2025-09-29T14:19:34.747508",
    document_count: 2
  },
  {
    id: "2af0f153-f95e-4981-a649-347c0bf70b3e",
    name: "Test Collection",
    description: "test",
    color: "#3b82f6",
    created_at: "2025-09-09T11:45:50.807273",
    updated_at: "2025-09-09T12:32:17.529969",
    document_count: 2
  }
];

// ============================================================================
// Mock Services Implementation
// ============================================================================

const createMockThemeService = (): ThemeService => {
  let currentTheme: Theme = (localStorage.getItem('dev-theme') as Theme) || 'light';
  const listeners: Set<(theme: Theme) => void> = new Set();

  const notifyListeners = () => {
    listeners.forEach(listener => {
      try {
        listener(currentTheme);
      } catch (error) {
        console.error('Error in theme listener:', error);
      }
    });
  };

  // Listen for storage events (theme changes from DevWrapper)
  window.addEventListener('storage', (e) => {
    if (e.key === 'dev-theme' && e.newValue) {
      currentTheme = e.newValue as Theme;
      notifyListeners();
    }
  });

  // Custom event for same-window theme changes
  window.addEventListener('theme-changed', ((e: CustomEvent) => {
    currentTheme = e.detail.theme;
    notifyListeners();
  }) as EventListener);

  return {
    getCurrentTheme: () => currentTheme,
    addThemeChangeListener: (listener) => {
      listeners.add(listener);
      console.log('🎨 Theme listener added, current theme:', currentTheme);
    },
    removeThemeChangeListener: (listener) => {
      listeners.delete(listener);
      console.log('🎨 Theme listener removed');
    }
  };
};

const createMockApiService = (): ApiService => {
  return {
    get: async <T = any>(url: string): Promise<T> => {
      console.log('📡 Mock API GET:', url);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      if (url.includes('/collections')) {
        return mockCollections as any;
      }

      return [] as any;
    },

    post: async <T = any>(url: string, data?: any): Promise<T> => {
      console.log('📡 Mock API POST:', url, data);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true, id: Math.random().toString(36) } as any;
    },

    put: async <T = any>(url: string, data?: any): Promise<T> => {
      console.log('📡 Mock API PUT:', url, data);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true } as any;
    },

    delete: async <T = any>(url: string): Promise<T> => {
      console.log('📡 Mock API DELETE:', url);
      await new Promise(resolve => setTimeout(resolve, 300));
      return { success: true } as any;
    }
  };
};

const createMockSettingsService = (): SettingsService => {
  return {
    getSetting: async (key: string) => {
      console.log('⚙️ Mock Settings Get:', key);
      return null;
    },
    setSetting: async (key: string, value: any) => {
      console.log('⚙️ Mock Settings Set:', key, value);
    },
    getSettingDefinitions: async () => {
      console.log('⚙️ Mock Settings Get Definitions');
      return {};
    }
  };
};

const createMockPageContextService = (): PageContextService => {
  return {
    getCurrentPageContext: () => ({
      pageId: 'dev-page',
      pageName: 'CollectionViewer Development',
      pageRoute: '/dev/collection-viewer',
      isStudioPage: false
    }),
    onPageContextChange: (handler) => {
      console.log('📄 Page context listener added');
      return () => console.log('📄 Page context listener removed');
    }
  };
};

// ============================================================================
// DevWrapper Component
// ============================================================================

const DevWrapper: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem('dev-theme') as Theme) || 'light'
  );

  const mockServices: Services = {
    theme: createMockThemeService(),
    api: createMockApiService(),
    settings: createMockSettingsService(),
    pageContext: createMockPageContextService()
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('dev-theme', newTheme);

    // Dispatch custom event for theme service
    window.dispatchEvent(new CustomEvent('theme-changed', {
      detail: { theme: newTheme }
    }));

    // Apply to document for global styles
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-scrollbars');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark-scrollbars');
    }
  };

  useEffect(() => {
    // Apply initial theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark-scrollbars');
    }
  }, []);

  return (
    <div
      className={`dev-container ${theme === 'dark' ? 'dark-theme' : ''}`}
      style={{
        minHeight: '100vh',
        backgroundColor: theme === 'dark' ? '#0a0f1a' : '#f5f5f5',
        padding: '20px',
        transition: 'background-color 0.3s ease'
      }}
    >
      {/* Development Controls */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        gap: '10px',
        alignItems: 'center'
      }}>
        {/* Hot Reload Indicator */}
        <div
          className="hot-reload-indicator"
          style={{
            background: '#00d4aa',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          🔥 Hot Reload Active
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          style={{
            background: theme === 'dark' ? '#2a2a2a' : '#ffffff',
            color: theme === 'dark' ? '#e0e0e0' : '#333333',
            border: theme === 'dark' ? '1px solid #444' : '1px solid #ddd',
            padding: '8px 16px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      {/* Development Info Header */}
      <div style={{
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        border: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        boxShadow: theme === 'dark'
          ? '0 4px 12px rgba(0,0,0,0.3)'
          : '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}>
        <h1 style={{
          margin: '0 0 8px 0',
          color: theme === 'dark' ? '#e0e0e0' : '#333',
          fontSize: '28px',
          fontWeight: '700'
        }}>
          CollectionViewer Plugin - Development Mode
        </h1>
        <p style={{
          margin: 0,
          color: theme === 'dark' ? '#aaa' : '#666',
          fontSize: '14px'
        }}>
          🚀 Functional component with hooks • Mock services active • Theme switching enabled
        </p>
      </div>

      {/* Plugin Container */}
      <div style={{
        backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        border: theme === 'dark' ? '1px solid #444' : '1px solid #e0e0e0',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: theme === 'dark'
          ? '0 4px 12px rgba(0,0,0,0.3)'
          : '0 4px 12px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease'
      }}>
        <CollectionViewer services={mockServices} />
      </div>

      {/* Development Notes */}
      <div style={{
        marginTop: '20px',
        padding: '16px',
        backgroundColor: theme === 'dark' ? '#1a2332' : '#e8f4fd',
        border: theme === 'dark' ? '1px solid #2a3f5f' : '1px solid #b3d9f2',
        borderRadius: '8px',
        fontSize: '13px',
        color: theme === 'dark' ? '#aaa' : '#555',
        transition: 'all 0.3s ease'
      }}>
        <strong style={{ color: theme === 'dark' ? '#4a9eff' : '#0066cc' }}>
          💡 Development Tips:
        </strong>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
          <li>Edit files in <code>src/</code> to see hot reload in action</li>
          <li>Toggle theme to test dark/light mode compatibility</li>
          <li>Check console for API calls and service interactions</li>
          <li>Mock collections data is loaded automatically</li>
          <li>Use React DevTools to inspect component state</li>
        </ul>
      </div>
    </div>
  );
};

// ============================================================================
// Bootstrap Application
// ============================================================================

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <DevWrapper />
  </React.StrictMode>
);

// ============================================================================
// Global Styles for Development
// ============================================================================

const globalStyles = `
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  code {
    background: rgba(0,0,0,0.05);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
  }

  .dark-theme code {
    background: rgba(255,255,255,0.1);
  }

  /* Dark scrollbars */
  .dark-scrollbars::-webkit-scrollbar {
    width: 12px;
    height: 12px;
  }

  .dark-scrollbars::-webkit-scrollbar-track {
    background: #1a1a1a;
  }

  .dark-scrollbars::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 6px;
  }

  .dark-scrollbars::-webkit-scrollbar-thumb:hover {
    background: #555;
  }
`;

const styleElement = document.createElement('style');
styleElement.textContent = globalStyles;
document.head.appendChild(styleElement);

console.log('✅ CollectionViewer DevStandalone initialized');
console.log('🎨 Current theme:', localStorage.getItem('dev-theme') || 'light');
console.log('🔥 Hot reload ready - edit files in src/ to see changes');
