<template>
  <h1>q-data Web Worker</h1>
  <p>Thanks for participating in collecting data.
    All collected data is used in scientific purposes only.</p>
  <p>&copy; Sergei Solovev, 2022</p>
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
</style>

<script lang="ts">
import io from 'socket.io-client';

import { Options, Vue } from 'vue-class-component';

@Options({})
export default class App extends Vue {
  private readonly socket = io('/web-workers-manager/api');

  mounted() {
    this.socket.on('job-run', (job) => {
      console.log('Job', job, 'got');
      this.socket.emit('job-done', {
        ...job,
        done: true,
      });
    });
  }
}

</script>
