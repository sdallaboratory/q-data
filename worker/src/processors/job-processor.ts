import { Job, Worker } from 'bullmq';
import { ObjectId } from 'mongodb';
import { Disposable } from '../../../shared/interfaces/disposable';

/**
 * You should implements this class to create a Processor.
 * Processor syntactically is a async function which get's jobs data
 * and services from IoC container.
 * 
 * Basic class provides several useful utility properties and methods.
 */
export abstract class JobProcessorExecutor<TJob extends Job = Job> implements Disposable {

    protected abstract readonly job: TJob;
    protected readonly worker?: Worker;

    protected get params() {
        // TODO: Think how to implement auto inferring
        return this.job.data as TJob['data'];
    }

    protected reportProgress(value: number, max: number = 100, min = 0) {
        const percent = (value - min) / max * 100;
        const fixed = Math.round(percent * 10) / 10;
        return this.job.updateProgress(fixed);
    }

    protected stampId<T extends { id?: string | number }>(obj: T, project: (arg: T) => ObjectId = arg => new ObjectId(arg.id)) {
        return { ...obj, _id: project(obj) };
    }
    protected stampMeta<T extends object>(obj: T) {
        return {
            ...obj,
            _meta: {
                jobId: this.job.id,
                taskName: this.job.name,
                timestamp: new Date(),
            },
        };
    }

    abstract process(): Promise<TJob extends Job<any, infer U> ? U : never>;
    abstract dispose(): void | Promise<void>;
}