"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.environment = void 0;
exports.environment = {
    PORT: 3000,
    MONGO_DB: 'sergsol_diploma_2022',
    MONGO_CONNECTION_STRING: 'mongodb://mongo:27017/',
    REDIS_HOST: 'redis',
    REDIS_PORT: 6379,
    QUEUE_NAME_TASKS: 'Tasks',
    QUEUE_NAME_TASKS_BROWSER: 'BrowserTasks',
};
