<template>
  <h1>q-data Web Worker</h1>
  <p>Thanks for participating in collecting data.
    All collected data is used in scientific purposes only.</p>
  <p>&copy; Sergei Solovev, 2022</p>

  <h2>Logs</h2>

  <div class="logs">
    <p v-for="log in logs" :key="log">
      {{log}}
    </p>
  </div>
</template>

<style lang="scss">
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
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
  background-color: lightgreen;
  font-family: monospace;
  text-align: start;
}
</style>

<script lang="ts">
import io from 'socket.io-client';

import { Options, Vue } from 'vue-class-component';

@Options({})
export default class App extends Vue {
  private readonly socket = io({
    path: '/browser-workers-manager/socket.io',
  });

  public readonly logs: string[] = [];

  private log(...data: unknown[]) {
    const message = `${new Date().toLocaleString()} # ${data.join(' ')}`;
    this.logs.push(message);
    console.log(...data);
  }

  mounted() {
    // TODO: Add typings to jobs
    this.socket.on('browser-task-run', (job) => {
      this.log('Job', job, 'got');

      // TODO: Replace with real job execution implementation
      setTimeout((() => {
        const result = {
          done: true,
          userIds: [1, 2, 3, 5, 6, 78],
        };
        this.socket.emit('browser-task-done', result);
        this.log('Task', job.name, 'done');
      }), 5000);
    });

    if (this.socket) {
      this.log('Listening for tasks...');
    }
  }
}

</script>
