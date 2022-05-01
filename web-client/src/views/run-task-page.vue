<template>
  <label for="task-name">First Name
    <input v-model="task.name" type="text" id="task-name" placeholder="Task Name">
  </label>
  <button @click="run()">send</button>

</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({})
export default class HomeView extends Vue {
  public task = {
    name: undefined,
    data: {},
  };

  public async run() {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.task),
    });
  }
}

</script>
