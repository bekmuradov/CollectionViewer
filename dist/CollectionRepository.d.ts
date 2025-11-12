import type { HttpClient } from './HttpClient';
import type { Collection } from './types';
/**
 * CollectionRepository - Single Responsibility: Collection I/O operations
 *
 * Handles all HTTP communication for collections.
 * No business logic, just data access.
 */
export declare class CollectionRepository {
    private http;
    constructor(http: HttpClient);
    findAll(): Promise<Collection[]>;
    findById(id: string): Promise<Collection>;
    create(collection: Partial<Collection>): Promise<Collection>;
    update(id: string, collection: Partial<Collection>): Promise<Collection>;
    delete(id: string): Promise<void>;
}
//# sourceMappingURL=CollectionRepository.d.ts.map