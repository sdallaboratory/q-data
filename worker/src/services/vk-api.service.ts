import { injectable, scoped, Lifecycle } from "tsyringe";
import { API } from "vk-io";
import { APIMethods } from "vk-io/lib/api/schemas/methods";
import { environment } from "../../../shared/environment";
import { Disposable } from '../../../shared/interfaces/disposable';
import { BrowserTasksQueueService } from "./browser-tasks-queue.service";

@injectable()
@scoped(Lifecycle.ResolutionScoped)
export class VkApiService implements Disposable {

    constructor(
        private readonly queue: BrowserTasksQueueService,
    ) { }

    async execute<TResponse = unknown>(
        vkScriptCode: string,
        parent?: { queue: string, id: string },
    ) {
        const job = await this.queue.queue.add('execute', { code: vkScriptCode }, {
            parent,
            attempts: environment.JOB_ATTEMPTS,
        });
        const response = await job.waitUntilFinished(this.queue.events);
        return response.response as TResponse;
    }

    async call<
        TArea extends keyof APIMethods,
        TMethod extends keyof APIMethods[TArea],
        >(
            area: TArea,
            method: TMethod,
            params: Parameters<Extract<
                APIMethods[TArea][TMethod],
                (...args: any) => any
            >>[number],
            parent?: { queue: string, id: string },
    ) {
        type TPromise = Extract<
            ReturnType<Extract<
                APIMethods[TArea][TMethod],
                (...args: any) => any>
            >,
            Promise<any>
        >;
        type TResult = TPromise extends Promise<infer UResult>
            ? UResult
            : never;
        const name = `${area}.${method}`;
        const job = await this.queue.queue.add(name, params, {
            parent,
            attempts: environment.JOB_ATTEMPTS,
        });
        const response = await job.waitUntilFinished(this.queue.events);
        return response.response as TResult;
    }

    async callButch<
        TArea extends keyof APIMethods,
        TMethod extends keyof APIMethods[TArea],
        >(
            area: TArea,
            method: TMethod,
            params: Array<Parameters<Extract<
                APIMethods[TArea][TMethod],
                (...args: any) => any
            >>[number]>,
            parent?: { queue: string, id: string },
    ) {
        type TPromise = Extract<
            ReturnType<Extract<
                APIMethods[TArea][TMethod],
                (...args: any) => any>
            >,
            Promise<any>
        >;
        type TResult = TPromise extends Promise<infer UResult>
            ? UResult[]
            : never;
        const code = `return [
            ${params.map(p => `API.${area}.${method}(${JSON.stringify(p)})`).join(', ')}
        ];`;
        return await this.execute<TResult>(code);
    }

    async dispose() {
        await this.queue.dispose();
    }

}
