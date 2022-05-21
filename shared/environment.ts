export const environment = {
    PORT: 3000,
    MONGO_DB: 'q-data',
    MONGO_CONNECTION_STRING: 'mongodb://mongo:27017/',
    REDIS_HOST: 'redis',
    REDIS_PORT: 6379,
    QUEUE_NAME_TASKS: 'Tasks',
    QUEUE_NAME_TASKS_BROWSER: 'BrowserTasks',
    JOB_ATTEMPTS: 5,
} as const;