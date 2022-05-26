import { singleton } from "tsyringe";
import { Task } from "../../../../shared/models/tasks/task";
import { JobProcessor } from "../job-processor";

type JobProcessorConstructor = new (...args: any[]) => JobProcessor;

type ProcessorRegistration = {
    processor: JobProcessorConstructor;
    defaultParams?: object;
    type?: 'default';
};

@singleton()
export class ProcessorsRegistry extends Map<string, Required<ProcessorRegistration>> {

    public register({ processor, defaultParams = {}, type = "default" }: ProcessorRegistration) {
        this.set(processor.name, { processor, defaultParams, type });
    }

    public registerAll(...processors: ProcessorRegistration[]) {
        processors.forEach((processor) => this.register(processor));
    }

    public list(): Task[] {
        return [...this.values()].map(({ defaultParams: params, type, processor }) => ({
            name: processor.name,
            params,
            type
        }));
    }

}
