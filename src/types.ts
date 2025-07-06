interface Store {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<unknown>;
}


export type { Store };