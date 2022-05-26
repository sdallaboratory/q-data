import express from 'express';
import { log } from '../../shared/logger/log';
import { Queue, QueueEvents } from 'bullmq';
import { Task } from '../../shared/models/tasks/task';
import { vkCollectGroupsDefaultParams } from '../../shared/models/tasks/vk-collect-groups/vk-collect-groups-default-params';
import { vkCollectGroupsMembersDefaultParams } from '../../shared/models/tasks/vk-collect-groups-members/vk-collect-groups-members-default-params';
import { environment } from '../../shared/environment';
import { vkCollectFriendsDefaultParams } from '../../shared/models/tasks/vk-collect-friends/vk-collect-friends-default-params';
import { vkMergeGroupsMembersDefaultParams } from '../../shared/models/tasks/vk-merge-groups-members/vk-merge-groups-members-default-params';

const PORT = 3000;

const app = express();
app.use(express.json());

const PARAMS = {
    connection: {
        host: environment.REDIS_HOST,
        port: environment.REDIS_PORT,
    },
};

// TODO: Add sctrict concrete typing for generics
const tasksQueue = new Queue(environment.QUEUE_NAME_TASKS, PARAMS);
const tasksQueueEvents = new QueueEvents(environment.QUEUE_NAME_TASKS, PARAMS);

app.use((req, res, next) => {
    log('HTTP', `request on ${req.method} ${req.url}`);
    next();
})

// Routes

app.get('/api/tasks', async (req, res) => {
    const job = await tasksQueue.add('SystemGetJobsList', {});
    const result = await job.waitUntilFinished(tasksQueueEvents);
    res.send(result);
});

app.post<string, unknown, unknown, Task>('/api/tasks', async (req, res) => {
    const task = req.body as Task | undefined;
    if (!task) {
        throw new Error('body must be presented.');
    }
    if (task.type !== 'default') {
        throw new Error('Only default tasks can be ran via HTTP API.');
    }
    const options = task.options || {};
    const job = await tasksQueue.add(task.name, task.params, { attempts: environment.JOB_ATTEMPTS, ...options });
    log('HTTP', `successfully created task ${task.name}.`);
    res.status(201).send(job);
});

app.delete('/api/tasks', async (req, res) => {
    log('HTTP', `Removing tasks from queue`);
    const removed = await Promise.all([
        tasksQueue.clean(0, 0, 'delayed'),
        tasksQueue.clean(0, 0, 'paused'),
        tasksQueue.clean(0, 0, 'wait'),
        tasksQueue.clean(0, 0, 'active'),
    ]);
    log('HTTP', `Removed tasks from queue ${removed.flatMap(t => t)}`);
    res.sendStatus(200);
});

/**
 * @deprecated The endpoint is added for testing purposes. Avoid using it as it can be removed at any time.
 */
// app.post<string, unknown, unknown, Task>('/api/browser-tasks', async (req, res) => {
//     const task = req.body;
//     if (!task) {
//         throw new Error('body must be presented');
//     }
//     await browserTasksQueue.add(task.name, task, { attempts: 5 });
//     log('HTTP', `successfully created browser task ${task.name}`);
//     res.sendStatus(201);
// });

// Starting server

app.listen(PORT, () => {
    log('HTTP', `Server is up and listening on port ${PORT}`);
});