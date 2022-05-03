import { Queue, QueueEvents } from 'bullmq';
import { injectable, scoped, Lifecycle } from 'tsyringe';
import { environment } from '../../../shared/environment';
import { Disposable } from '../../../shared/interfaces/disposable';

@injectable()
@scoped(Lifecycle.ResolutionScoped)
export class BrowserTasksQueueService implements Disposable {

    private readonly connection = {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    };

    public queue = new Queue(environment.QUEUE_NAME_TASKS_BROWSER, {
        connection: this.connection,
    });

    public events = new QueueEvents(environment.QUEUE_NAME_TASKS_BROWSER, {
        connection: this.connection,
    })

    async dispose() {
        await this.queue.close();
    }

}