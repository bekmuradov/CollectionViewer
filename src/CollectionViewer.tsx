import React, { useState, useEffect } from 'react';
import { HttpClient } from './HttpClient';
import { CollectionRepository } from './CollectionRepository';
import type { Collection } from './types';
import './CollectionViewer.css';

/**
 * CollectionViewer - A functional component with hooks
 * Demonstrates modern React patterns with useState and useEffect
 */
const CollectionViewer: React.FC = () => {
  // State hooks
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Effect hook to fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize HttpClient and Repository
        const httpClient = new HttpClient('http://127.0.0.1:8000');
        const collectionRepo = new CollectionRepository(httpClient);

        // Fetch all collections
        const data = await collectionRepo.findAll();
        setCollections(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch collections');
        console.error('Error fetching collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, []); // Empty dependency array = run once on mount

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="collection-viewer">
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading collections...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="collection-viewer">
        <div className="error">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // Empty state
  if (collections.length === 0) {
    return (
      <div className="collection-viewer">
        <div className="empty-state">
          <h3>No Collections Found</h3>
          <p>There are no collections available at the moment.</p>
        </div>
      </div>
    );
  }

  // Render collections
  return (
    <div className="collection-viewer">
      <div className="header">
        <h2>Collections</h2>
        <span className="count">{collections.length} total</span>
      </div>

      <div className="collections-grid">
        {collections.map((collection) => (
          <div key={collection.id} className="collection-card">
            <div
              className="collection-color"
              style={{ backgroundColor: collection.color }}
            ></div>

            <div className="collection-content">
              <h3 className="collection-name">{collection.name}</h3>
              <p className="collection-description">{collection.description}</p>

              <div className="collection-meta">
                <div className="meta-item">
                  <span className="meta-label">Documents:</span>
                  <span className="meta-value">{collection.document_count}</span>
                </div>

                {collection.chat_session_count !== undefined && (
                  <div className="meta-item">
                    <span className="meta-label">Chat Sessions:</span>
                    <span className="meta-value">{collection.chat_session_count}</span>
                  </div>
                )}

                <div className="meta-item">
                  <span className="meta-label">Created:</span>
                  <span className="meta-value">{formatDate(collection.created_at)}</span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Updated:</span>
                  <span className="meta-value">{formatDate(collection.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CollectionViewer;
