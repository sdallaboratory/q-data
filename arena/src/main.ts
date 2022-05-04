import { Queue } from 'bullmq'
import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { BullAdapter } from '@bull-board/api/bullAdapter'
import { ExpressAdapter } from '@bull-board/express'
import express from 'express';

const REDIS_HOST = 'redis';
const REDIS_PORT = 6379;
const BASE_HREF = '/arena';
const QUEUE_NAME_TASKS = 'Tasks'
const QUEUE_NAME_TASKS_BROWSER = 'BrowserTasks'
const PORT = 80;

const queues = [
    QUEUE_NAME_TASKS,
    QUEUE_NAME_TASKS_BROWSER
].map(name => new Queue(name, {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
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
console.log(`Listening on port ${PORT}...`);


// import Arena from 'bull-arena';
// import express from 'express';
// import { Queue } from 'bullmq';



// const arena = Arena({
//     BullMQ: Queue,
//     queues: [
//         {
//             type: 'bullmq',
//             name: QUEUE_NAME_TASKS,
//             hostId: QUEUE_NAME_TASKS,
//             redis: {
//                 host: REDIS_HOST,
//                 port: REDIS_PORT,
//             },
//         },
//     ],
// }, {
//     // useCdn: false,
//     port: 80,
//     disableListen: false,
// });

// app.use(BASE_HREF, arena);
