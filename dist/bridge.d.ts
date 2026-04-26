export declare function call(scheme: string): void;
export declare function callAwait<T>(scheme: string, key: string): Promise<T>;
export declare function on(name: string, handler: (data: any) => void): () => void;
