
import { Queue } from 'bullmq';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { Task } from '../shared/models/task.interface';

const REDIS_HOST = 'redis';
const REDIS_PORT = 6379;
const QUEUE_NAME = 'Tasks'

const app = express();
const server = http.createServer(app);
const io = new Server(server);


const queue = new Queue<Task>(QUEUE_NAME, {
  connection: {
    host: REDIS_HOST,
    port: REDIS_PORT,
  }
});

io.on('connection', (socket) => {
  socket.emit('task-run', {name: 'TEST'})
  console.log('a user connected');
});

io.on('task-done', (data) => {
  console.log('Task Done', data);
});

server.listen(3000, () => {
  console.log('listening on port 3000');
});
