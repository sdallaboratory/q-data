import express from 'express';
import { log } from '../shared/logger/log';
import { Queue } from 'bullmq';
import { Task } from '../shared/models/task.interface';

const PORT = 3000;
const REDIS_HOST = 'redis';
const REDIS_PORT = 6379;
const QUEUE_NAME = 'Tasks'

const app = express();
app.use(express.json());

const queue = new Queue<Task>(QUEUE_NAME, {
    connection: {
        host: REDIS_HOST,
        port: REDIS_PORT,
    }
});

app.use((req, res, next) => {
    log('HTTP', `request on ${req.method} ${req.url}`);
    next();
})

app.get('/api/tasks', async (req, res) => {
    res.send([
        'task1',
        'task2',
    ]);
});

app.get('/api/jobs', async (req, res) => {
    const jobs = await queue.getJobs();
    res.send(jobs.map(job  => job.asJSON()));
});

app.post<string, unknown, unknown, Task>('/api/tasks', async (req, res) => {
    const task = req.body;
    if (!task) {
        throw new Error('name must be specified');
    }
    const name = `${task.name}-${new Date().toLocaleString()}-${Math.random()}`;
    await queue.add(name, task, { attempts: 10 });
    log('System', `successfully created task task ${name}`);
    res.sendStatus(201);
})

app.listen(PORT, () => {
    log('System', `Server is up and listening on port ${PORT}`);
});