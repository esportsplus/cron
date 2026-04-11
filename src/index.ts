import { CronJob } from 'cron';
import { Interval, LockState, Store } from './types';


const INTERVAL_RE = /^(\d+)(s|m|h)$/;

const TIMEOUT_MAX = 5 * 1000;

const TIMEOUT_MIN = 1000;


export default (factory: (field: string) => Store) => {
    let store = factory('@esportsplus/server/cron.lock');

    return {
        debounce: (key: string, fn: (() => Promise<void> | void), timeout?: number) => {
            let run = async () => {
                    try {
                        let { running, updatedAt } = (await store.get<LockState>(key)) || {
                                running: false,
                                updatedAt: Date.now()
                            };

                        if (running && (!timeout || (updatedAt + timeout) > Date.now())) {
                            return;
                        }

                        await store.set(key, { running: true, updatedAt: Date.now() });

                        try {
                            await fn();
                        }
                        finally {
                            await store.set(key, { running: false, updatedAt: Date.now() });
                        }
                    }
                    catch (e) {
                        console.error(`@esportsplus/cron: debounce('${key}') failed:`, e);
                    }
                };

            return () => {
                setTimeout(run, Math.floor(Math.random() * (TIMEOUT_MAX - TIMEOUT_MIN)) + TIMEOUT_MIN)
            };
        },
        every: (time: Interval, fn: () => Promise<void> | void) => {
            let cronTime,
                match = INTERVAL_RE.exec(time);

            if (!match) {
                throw new Error(`Cron: invalid interval '${time}'`);
            }

            let n = parseInt(match[1], 10),
                unit = match[2];

            switch (unit) {
                case 's':
                    if (n < 1 || n > 59) {
                        throw new Error(`Cron: seconds interval must be 1-59, got ${n}`);
                    }

                    cronTime = `*/${n} * * * * *`;
                    break;
                case 'm':
                    if (n < 1 || n > 59) {
                        throw new Error(`Cron: minutes interval must be 1-59, got ${n}`);
                    }

                    cronTime = `0 */${n} * * * *`;
                    break;
                case 'h':
                    if (n < 1 || n > 23) {
                        throw new Error(`Cron: hours interval must be 1-23, got ${n}`);
                    }

                    cronTime = `0 0 */${n} * * *`;
                    break;
                default:
                    throw new Error(`Cron: invalid interval unit '${unit}'`);
            }

            return CronJob.from({ cronTime, onTick: fn, start: true });
        },
        lock: async <T>(key: string, fn: () => Promise<T> | T, timeout?: number): Promise<T | undefined> => {
            let { running, updatedAt } = (await store.get<LockState>(key)) || {
                    running: false,
                    updatedAt: Date.now()
                };

            if (running && (!timeout || (updatedAt + timeout) > Date.now())) {
                return;
            }

            await store.set(key, { running: true, updatedAt: Date.now() });

            try {
                return await fn();
            }
            finally {
                await store.set(key, { running: false, updatedAt: Date.now() });
            }
        },
        once: async (key: string, fn: () => Promise<void> | void) => {
            let executed = await store.get<boolean>(key);

            if (executed) {
                return;
            }

            await store.set(key, true);

            try {
                await fn();
            }
            catch (e) {
                await store.set(key, false);
                throw e;
            }
        },
        schedule: (args: Parameters<typeof CronJob.from>[0]) => CronJob.from(args),
        throttle: (key: string, ms: number, fn: () => Promise<void> | void) => {
            return async () => {
                let last = await store.get<number>(key);

                if (last && (last + ms) > Date.now()) {
                    return;
                }

                await store.set(key, Date.now());
                await fn();
            };
        }
    };
};