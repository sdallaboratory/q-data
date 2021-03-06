<template>
  <h1>q-data Web Worker</h1>
  <p>Thanks for participating in collecting data.
    All collected data is used in scientific purposes only.</p>
  <p>&copy; Sergei Solovev, 2022</p>
  <template v-if="!user">
    <h2>Authorization VK</h2>
    <p>Authorize via VK widget for starting browser-worker</p>
    <div id="vk-auth-widget">
    </div>
  </template>
  <template v-if="logs.length">
    <h2>Logs</h2>
    <div class="logs">
      <p v-for="log in logs" :key="log" class="log">
        {{ log }}
      </p>
    </div>
  </template>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
  align-items: center;
}

nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}

.logs {
  box-sizing: border-box;
  width: 100%;
  max-width: 700px;
  padding: 5px 20px;
  margin: auto;
  font-family: monospace;
  text-align: start;
}

.log {
  animation: log-appear 3s ease-out;
}

@keyframes log-appear {
  from {
    background-color: lightgreen;
  }

  to {
    background-color: transparent;
  }
}
</style>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import io, { Socket } from 'socket.io-client';
import { Job } from 'bullmq';
import VkApi from './services/vk.service';
import environment from './environment';

@Options({})
export default class App extends Vue {
  private socket?: Socket;

  public readonly logs: string[] = [];

  public user?: Record<string, string>; // TODO: Add typings

  private log(...data: unknown[]) {
    const message = `${new Date().toLocaleString()} # ${data.join(' ')}`;
    this.logs.unshift(message);
    console.log(...data);
  }

  async mounted() {
    const api = await VkApi.create(8155851, 'vk-auth-widget');
    this.user = await api.authorized;
    this.log('Пользователь', this.user.first_name, 'авторизован');

    this.socket = io({
      path: '/browser-workers-manager/socket.io',
    });

    // TODO: Add typings to jobs
    this.socket?.on('browser-task-run', async (job: Job) => {
      this.log('Job', job.name, 'got. Starting Vk API request');

      const method = job.name;
      const params = job.data;

      // TODO: Add more strict typings
      const result = await api.call(method, params) as { response: any } | { error: any };
      if ('error' in result) {
        this.log('Task', job.name, 'finished with error', result.error.error_msg);
        // TODO: Move events name to shared
        this.socket?.emit('browser-task-error', result);
      } else {
        this.log('Task', job.name, 'done');
        this.socket?.emit('browser-task-done', result);
      }
    });

    this.socket.on('connect', () => this.log('Connected to browser-tasks-manager. Listening for tasks...'));
    this.socket.on('connect_error', () => this.log('Error while connecting to browser-tasks-manager. Trying to reconect...'));
    this.socket.on('disconnect', () => this.log('Unexpectdly disconnected from server. Trying to reconect...'));
  }
}

</script>
