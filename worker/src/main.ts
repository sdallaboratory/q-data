import 'reflect-metadata';
import { Job, Worker } from 'bullmq';
import { environment } from '../../shared/environment';
import { log } from '../../shared/logger/log';
import { container } from 'tsyringe';
import { processorsRegistry } from './processors/registry/processors-registry';
import { JobProcessorExecutor } from './processors/job-processor';
import "./processors/vk-collect-groups/vk-collect-groups.processor";

async function runJob(job: Job) {
    const Processor = processorsRegistry.get(job.name);
    if (!Processor) {
        const message = `No appropriate processor found for task ${job.name}`;
        log('System', message);
        throw new Error(message);
    }
    const jobContainer = container.createChildContainer();
    jobContainer.register(Job, { useValue: job });
    const processor = jobContainer.resolve(Processor) as JobProcessorExecutor;
    log('System', `Successfully matched processor for task ${job.name}. Starting processing...`);
    const result = await processor.process();
    processor.dispose();
    jobContainer.reset();
    return result;
}

const worker = new Worker(environment.QUEUE_NAME_TASKS, runJob, {
    connection: {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    },
});

log('System', `Worker is up and listening for jobs...`);
