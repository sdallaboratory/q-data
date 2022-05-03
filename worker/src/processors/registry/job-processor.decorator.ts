import { injectable } from "tsyringe";
import { JobProcessorRegistrationParams } from "./job-processor-registration-params";
import { processorsRegistry } from "./processors-registry";

/**
 * Global registry of registered processors
 */
export function JobProcessor<T>(params: JobProcessorRegistrationParams) {
    
    const decorator = injectable();
    
    return function (constructor: { new(...args: any[]): T }) {
        decorator(constructor);
        processorsRegistry.set(params.taskName, constructor);
    };
}