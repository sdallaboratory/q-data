import { Job, Worker } from 'bullmq';
import { ObjectId } from 'mongodb';
import { environment } from '../../../shared/environment';
import { Disposable } from '../../../shared/interfaces/disposable';
import { log } from '../../../shared/logger/log';

/**
 * You should implements this class to create a Processor.
 * Processor syntactically is a async function which get's jobs data
 * and services from IoC container.
 * 
 * Basic class provides several useful utility properties and methods.
 */
export abstract class JobProcessor<TJob extends Job = Job> implements Partial<Disposable> {

    protected abstract readonly job: TJob;
    protected readonly worker?: Worker;

    protected get params() {
        // TODO: Think how to implement auto inferring
        return this.job.data as TJob['data'];
    }

    /**
     * Reports progress to a queue
     * @param value current progress
     * @param max default 100
     * @param min default 0
     * @returns Promise which resolves when progress is wrote to a queue
     */
    protected reportProgress(value: number, max: number = 100, min = 0) {
        const percent = (value - min) / max * 100;
        const fixed = Math.round(percent * 10) / 10;
        return this.job.updateProgress(fixed);
    }

    protected stampId<T extends { id?: string | number }>(
        obj: T,
        project: (arg: T) => ObjectId = arg => new ObjectId(arg.id),
    ) {
        return { ...obj, _id: project(obj) };
    }

    protected stampMeta<T extends object>(obj: T) {
        return {
            ...obj,
            _meta: {
                jobId: this.job.id,
                taskName: this.job.name,
                timestamp: new Date(),
                composeRunId: environment.COMPOSE_RUN_ID,
            },
        };
    }

    /**
     * Logs concatenated strings 
     * @param args args to log
     */
    protected log(...args: (string | number)[]) {
        const message = log('System', args.join(', '), this.job.id)
        this.job.log(message);
    }

    abstract process(): Promise<TJob extends Job<any, infer U> ? U : never>;
    abstract dispose?(): void | Promise<void>;

    /**
     * Checkes specified params object for validity 
     * @param params params object to be checked
     */
    validateParams?(params: unknown): params is TJob extends Job<infer TData> ? TData : never;
}