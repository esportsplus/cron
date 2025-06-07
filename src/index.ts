import { CronJob } from 'cron';
import { Store } from './types';


const TIMEOUT_MAX = 5 * 1000;

const TIMEOUT_MIN = 1000;


export default (factory: (field: string) => Store) => {
    let store = factory('@esportsplus/server/cron.lock');

    return {
        debounce: (key: string, fn: VoidFunction, timeout?: number) => {
            let run = async () => {
                    let { running, updatedAt } = (await store.get<{ running: boolean, updatedAt: number }>(key)) || {
                            running: false,
                            updatedAt: Date.now()
                        };

                    if (running && (!timeout || (updatedAt + timeout) > Date.now())) {
                        return;
                    }

                    await store.set(key, { running: true, updatedAt: Date.now() });
                    await fn();
                    await store.set(key, { running: false, updatedAt: Date.now() });
                };

            return () => {
                setTimeout(run, Math.floor(Math.random() * (TIMEOUT_MAX - TIMEOUT_MIN)) + TIMEOUT_MIN)
            };
        },
        schedule: (
            (...args: ConstructorParameters<typeof CronJob>) => new CronJob(...args)
        ) as (...args: ConstructorParameters<typeof CronJob>) => CronJob
    };
};