import express from 'express';
import { log } from '../../shared/logger/log';
import { Queue } from 'bullmq';
import { Task } from '../../shared/models/task.interface';

const PORT = 3000;
const REDIS_HOST = 'redis';
const REDIS_PORT = 6379;
const QUEUE_NAME_TASKS = 'Tasks'
const QUEUE_NAME_TASKS_BROWSER = 'BrowserTasks';

const app = express();
app.use(express.json());

// TODO: Add sctrict concrete typing for generics
const [tasksQueue, browserTasksQueue] = [
    QUEUE_NAME_TASKS,
    QUEUE_NAME_TASKS_BROWSER
].map(name => new Queue(name, {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
    },
}));

app.use((req, res, next) => {
    log('HTTP', `request on ${req.method} ${req.url}`);
    next();
})

// Routes

// app.get('/api/jobs', async (req, res) => {
//     const jobs = await queue.getJobs();
//     res.send(jobs.map(job  => job.asJSON()));
// });

app.get('/api/tasks', async (req, res) => {
    res.send([
        'task1',
        'task2',
    ]);
});

app.post<string, unknown, unknown, Task>('/api/tasks', async (req, res) => {
    const task = req.body;
    if (!task) {
        throw new Error('body must be presented');
    }
    const name = `${task.type}-${new Date().getTime()}-${(Math.random() * 100).toFixed()}`;
    await tasksQueue.add(name, task, { attempts: 3 });
    log('System', `successfully created task ${name}`);
    res.sendStatus(201);
})

app.post<string, unknown, unknown, Task>('/api/browser-tasks', async (req, res) => {
    const task = req.body;
    if (!task) {
        throw new Error('body must be presented');
    }
    const name = `${task.type}-${new Date().getTime()}-${(Math.random() * 100).toFixed()}`;
    await browserTasksQueue.add(name, task, { attempts: 5 });
    log('System', `successfully created browser task ${name}`);
    res.sendStatus(201);
})

// Starting server

app.listen(PORT, () => {
    log('System', `Server is up and listening on port ${PORT}`);
});