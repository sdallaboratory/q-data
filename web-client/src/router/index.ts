import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'tasks',
    component: () => import(/* webpackChunkName: "tasks" */ '../views/run-task-view.vue'),
  },
  {
    path: '/jobs',
    name: 'jobs',
    component: () => import(/* webpackChunkName: "jobs" */ '../views/jobs-view.vue'),
  },
  {
    path: '/mongo-express',
    name: 'mongo-express',
    component: () => import(/* webpackChunkName: "mongo-express" */ '../views/mongo-express-view.vue'),
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
});

export default router;
