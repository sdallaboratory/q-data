import { Job } from "bullmq";
import _ from "lodash";
import { container, inject } from "tsyringe";
import { JobProcessor } from "../job-processor";
import { ProcessorsRegistry } from "../registry/processors-registry";

export class SystemGetJobsList extends JobProcessor {

    dispose() { }

    constructor(
        @inject(Job) protected readonly job: Job,
    ) {
        super();
    }

    async process() {
        this.log(`Getting jobjs list...`);
        const registry = container.resolve(ProcessorsRegistry);
        const tasks = registry.list();
        return tasks;
    }
}