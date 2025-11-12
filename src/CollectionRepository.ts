import type { HttpClient } from './HttpClient';
import type { Collection } from './types';

/**
 * CollectionRepository - Single Responsibility: Collection I/O operations
 *
 * Handles all HTTP communication for collections.
 * No business logic, just data access.
 */
export class CollectionRepository {
  constructor(private http: HttpClient) {}

  async findAll(): Promise<Collection[]> {
    return this.http.get<Collection[]>('/collections/');
  }

  async findById(id: string): Promise<Collection> {
    return this.http.get<Collection>(`/collections/${id}`);
  }

  async create(collection: Partial<Collection>): Promise<Collection> {
    return this.http.post<Collection>('/collections/', collection);
  }

  async update(id: string, collection: Partial<Collection>): Promise<Collection> {
    return this.http.put<Collection>(`/collections/${id}`, collection);
  }

  async delete(id: string): Promise<void> {
    return this.http.delete<void>(`/collections/${id}`);
  }
}
