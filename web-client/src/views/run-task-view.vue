<template>
  <label for="task-name">First Name
    <input v-model="task.name" type="text" id="task-name" placeholder="Task Name">
  </label>
  <button @click="runTask()">Run task</button>
  <button @click="runTask('browser')">Run browser task</button>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({})
export default class HomeView extends Vue {
  public task = {
    type: undefined,
    params: { id: 'test-id', skip: 343 },
  };

  // TODO: Move to separate type file
  public async runTask(type: 'default' | 'browser' = 'default') {
    const uri = type === 'browser' ? '/api/browser-tasks' : '/api/tasks';
    await fetch(uri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.task),
    });
  }
}

</script>
