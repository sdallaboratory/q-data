
import { Queue, Worker } from 'bullmq';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { environment } from '../../shared/environment';
import { log } from '../../shared/logger/log';
import { Task } from '../../shared/models/tasks/task';
import { sleep } from '../../shared/utils/sleep';

const PORT = 3000;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 1e8, // 100mb
});

// // TODO: Add cleat typings
// const queue = new Queue<Task['params'], void, Task['name']>(environment.QUEUE_NAME_TASKS, {
//   connection: {
//     host: environment.REDIS_HOST,
//     port: environment.REDIS_PORT,
//   }
// });

io.on('connection', (socket) => {
  log('WebSocket', 'A new browser-worker connected', socket.id);
  log('WebSocket', 'Starting listening to browser tasks queue...', socket.id);

  // TODO: Maybe move to child process
  // TODO: Add Job typings
  const worker = new Worker(environment.QUEUE_NAME_TASKS_BROWSER, async job => {
    await sleep(environment.VK_API_CALL_INTERVAL_MS);
    log('WebSocket', `Running browser task ${job.name} ${job.id}`, socket.id);
    const startTime = Date.now();
    const result = await new Promise((resolve, reject) => {
      socket.emit('browser-task-run', job);

      const timeout = setTimeout(() => {
        const message = `Browser task failed with timeout ${environment.BROWSER_TASK_TIMEOUT_MS}ms`
        log('WebSocket', message, socket.id);
        reject(new Error(message));
        dispose();
      }, environment.BROWSER_TASK_TIMEOUT_MS);

      const doneListener = async (result: unknown) => {
        await job.updateProgress(100);
        resolve(result);
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
    });

    log('System', `Done ${job.name} ${job.id} in ${Date.now() - startTime} ms`, socket.id)
    return result;
  }, {
    // limiter: {
    //   max: 1,
    //   duration: environment.VK_API_CALL_INTERVAL_MS,
    // },
    connection: {
      host: environment.REDIS_HOST,
      port: environment.REDIS_PORT,
    },
  });

  socket.on('disconnect', () => {
    worker.close();
    log('WebSocket', `Browser worker disconnected`, socket.id);
  })
});

server.listen(PORT, () => {
  console.log(`Listening for browser-workers on port ${PORT}...`);
});
