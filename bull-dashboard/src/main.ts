import { Queue } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express';
import { log } from '../../shared/logger/log';
import { environment } from '../../shared/environment';

// TODO: Move to global environment
const BASE_HREF = '/bull-dashboard';
const PORT = 80;

const queues = [
    environment.QUEUE_NAME_TASKS,
    environment.QUEUE_NAME_TASKS_BROWSER
].map(name => new Queue(name, {
    connection: {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    },
})).map(
    queue => new BullMQAdapter(queue),
);

const serverAdapter = new ExpressAdapter();

const board = createBullBoard({
    queues,
    serverAdapter: serverAdapter,
});

serverAdapter.setBasePath(BASE_HREF);

const app = express();
app.use(BASE_HREF, serverAdapter.getRouter());
app.listen(PORT);

log('System', `Listening on port ${PORT}...`);
