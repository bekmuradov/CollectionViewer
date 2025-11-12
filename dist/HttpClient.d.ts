/**
 * Simple HttpClient for API communication
 * Handles authentication and basic HTTP operations
 */
export declare class HttpClient {
    private baseURL;
    constructor(baseURL?: string);
    /**
     * Get auth token from localStorage
     */
    private getAuthToken;
    /**
     * Build headers with authentication
     */
    private getHeaders;
    /**
     * Generic GET request
     */
    get<T>(endpoint: string): Promise<T>;
    /**
     * Generic POST request
     */
    post<T>(endpoint: string, data: any): Promise<T>;
    /**
     * Generic PUT request
     */
    put<T>(endpoint: string, data: any): Promise<T>;
    /**
     * Generic DELETE request
     */
    delete<T>(endpoint: string): Promise<T>;
}
//# sourceMappingURL=HttpClient.d.ts.map