import { injectable, scoped, Lifecycle } from "tsyringe";
import { APIMethods } from "vk-io/lib/api/schemas/methods";
import { Disposable } from '../../../shared/interfaces/disposable';
import { BrowserTasksQueueService } from "./browser-tasks-queue.service";

@injectable()
@scoped(Lifecycle.ResolutionScoped)
export class VkApiService implements Disposable {

    constructor(
        private readonly queue: BrowserTasksQueueService,
    ) { }

    async call<
        TArea extends keyof APIMethods,
        TMethod extends keyof APIMethods[TArea],
        >(
            area: TArea,
            method: TMethod,
            params: Parameters<Extract<APIMethods[TArea][TMethod], (...args: any) => any>>[number],
            parent?: { queue: string, id: string },
    ) {
        type TPromise = Extract<ReturnType<Extract<APIMethods[TArea][TMethod], (...args: any) => any>>, Promise<any>>;
        type TResult = TPromise extends Promise<infer UResult> ? UResult : never;
        const name = `${area}.${method}`;
        const job = await this.queue.queue.add(name, params, { parent, attempts: 5 });
        const response = await job.waitUntilFinished(this.queue.events);
        return response as TResult;
    }

    async dispose() {
        await this.queue.dispose();
    }

}
