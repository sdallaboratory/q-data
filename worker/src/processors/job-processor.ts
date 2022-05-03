import { Job } from 'bullmq';
import { Disposable } from '../../../shared/interfaces/disposable';

export abstract class JobProcessorExecutor<TJob extends Job = Job> implements Disposable {
    protected abstract readonly job: TJob;

    protected get params() {
        // TODO: Think how to implement auto inferring
        return this.job.data as TJob['data'];
    }

    protected reportProgress(value: number, max: number, min = 0) {
        const percent = (value - min) / max;
        this.job.updateProgress(percent);
    }

    abstract process(): Promise<TJob extends Job<any, infer U> ? U : never>;
    abstract dispose(): void | Promise<void>;
}