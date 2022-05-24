
import { Queue, Worker } from 'bullmq';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { environment } from '../../shared/environment';
import { log } from '../../shared/logger/log';
import { Task } from '../../shared/models/tasks/task';
import { sleep } from '../../shared/utils/sleep';

const REDIS_HOST = 'redis';
const REDIS_PORT = 6379;
const QUEUE_NAME_TASKS = 'Tasks'
const QUEUE_NAME_TASKS_BROWSER = 'BrowserTasks'
const BROWSER_TASK_TIMEOUT_MS = 10000;
const PORT = 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100mb
});

// TODO: Add cleat typings
const queue = new Queue<Task['params'], void, Task['name']>(QUEUE_NAME_TASKS, {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  }
});

io.on('connection', (socket) => {
  log('WebSocket', 'A new browser-worker connected', socket.id);
  log('WebSocket', 'Starting listening to browser tasks queue...', socket.id);

  // TODO: Maybe move to child process
  // TODO: Add Job typings
  const worker = new Worker(QUEUE_NAME_TASKS_BROWSER, async job => {
    const [result] = await Promise.all([
      new Promise((resolve, reject) => {

        log('WebSocket', `Running browser task ${job.name}`, socket.id);

        socket.emit('browser-task-run', job);

        const timeout = setTimeout(() => {
          const message = `Browser task failed with timeout ${BROWSER_TASK_TIMEOUT_MS}ms`
          log('WebSocket', message, socket.id);
          reject(new Error(message));
          dispose();
        }, BROWSER_TASK_TIMEOUT_MS);

        const doneListener = async (result: unknown) => {
          await job.updateProgress(100);
          resolve(result);
          log('WebSocket', `Successfully done task ${job.name}`, socket.id);
          dispose();
        };

        // TODO: Add global type for VK errors
        const errorListener = async (error: { error: { error_msg: string, error_code: number } }) => {
          const { error_code, error_msg } = error.error;
          reject(error);
          log('WebSocket', `Task ${job.name} failed. Error: ${error_code} (${error_msg})`, socket.id);
          dispose();
        };

        const disconnectListener = async () => {
          const message = `Browser task failed due to browser-worker disconnection`;
          log('WebSocket', message, socket.id);
          reject(new Error(message));
          worker.close();
          dispose();
        };

        function dispose() {
          socket.off('browser-task-done', doneListener);
          socket.off('browser-task-error', errorListener);
          socket.off('disconnect', disconnectListener);
          clearTimeout(timeout);
        }

        socket.on('browser-task-done', doneListener);
        socket.on('browser-task-error', errorListener);
        socket.on('disconnect', disconnectListener);
      }), sleep(environment.VK_API_CALL_INTERVAL_MS)]);
      return result;
  }, {
    connection: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
    concurrency: 1,
  });

  socket.on('disconnect', () => {
    worker.close();
    log('WebSocket', `Browser worker disconnected`, socket.id);
  })
});

server.listen(PORT, () => {
  console.log(`Listening for browser-workers on port ${PORT}...`);
});
