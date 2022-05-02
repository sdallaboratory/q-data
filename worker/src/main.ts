import "reflect-metadata";
import { Job, Processor, Queue, Worker } from 'bullmq';
import { environment } from '../../shared/environment';
import { log } from '../../shared/logger/log';
import { injectable, container } from "tsyringe";

const worker = new Worker(environment.QUEUE_NAME_TASKS, runJob, {
    connection: {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    },
});


interface JobProcessor<T = unknown> {
    // new(...args: any[]): T;
    execute(job: Job): Promise<T>;
    dispose?(): Promise<void>;
}

class BrowserTasksQueueProvider {
    public queue = new Queue(environment.QUEUE_NAME_TASKS_BROWSER, {
        connection: {
            host: environment.REDIS_HOST,
            port: environment.REDIS_PORT,
        },
    });
    async dispose() {
        await this.queue.close();
    }
}

interface VkGroup { id: number }

@injectable()
class JobProcessorVkCollectGroups implements JobProcessor<VkGroup[]> {

    constructor(
        private readonly vkQueue: BrowserTasksQueueProvider
    ) {

    }
    async execute(job: Job): Promise<VkGroup[]> {
        log('System', String(await this.vkQueue.queue.getWaitingCount()));
        return [{
            id: 122
        }]
    }

    public async dispose() {
        this.vkQueue.dispose();
    }

}
const processors = new Map<string, any>([
    ['vk-collect-groups', JobProcessorVkCollectGroups]
]);

async function runJob(job: Job) {
    const Processor = processors.get(job.data.type);
    if (!Processor) {
        const message = 'Unknown task type';
        log('System', message);
        throw new Error(message);
    }
    const processor = container.resolve(Processor) as JobProcessor;
    log('System', `Job ${job.name} started`);
    const result = await processor.execute(job);
    processor.dispose?.();
    return result;
}

// TODO: Implement JobProcessor interface and class implementations.
// Inject necessary dependencies while creating compoennt
