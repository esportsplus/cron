type Interval = `${number}${'s' | 'm' | 'h'}`;

type LockState = { running: boolean, updatedAt: number };

interface Store {
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<unknown>;
}


export type { Interval, LockState, Store };