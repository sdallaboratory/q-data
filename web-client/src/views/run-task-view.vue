<template>
  <h2>Available tasks</h2>
  <p>Select a task to run</p>
  <select v-model="selectedTask">
    <option v-for="task in availableTasks" :key="task.name" :value="task">{{ task.name }}</option>
  </select>
  <template v-if="selectedTask">
    <h2>{{ selectedTask.name }} (type: {{ selectedTask.type }})</h2>
    Here you can see default parameters of such kind of task. Tou can change it if necessary.
    Then press "Run task" to start execution.
    <Vue3JsonEditor v-model="selectedTask.params" :mode="'code'" @json-change="updateParams" />
    <button @click="runTask()">Run task</button>
    <button @click="deleteJobs()">Delete all pending and running tasks</button>
  </template>
</template>

<style scoped lang="scss">
button {
  padding: 20px;
  margin: 10px 0;
}
</style>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';
import { Vue3JsonEditor } from 'vue3-json-editor';
// eslint-disable-next-line import/no-relative-packages
import { Task } from '../../../shared/models/tasks/task';

@Options({
  components: {
    Vue3JsonEditor,
  },
})
export default class HomeView extends Vue {
  public readonly log = console.log;

  public availableTasks = [] as Task[];

  public selectedTask: Task | false = false;

  public updateParams(params: Task['params']) {
    if (this.selectedTask) {
      this.selectedTask.params = params;
    }
  }

  async created() {
    this.availableTasks = await fetch('/api/tasks')
      .then((response) => response.json());
    if (!this.selectedTask) {
      [this.selectedTask] = this.availableTasks;
    }
  }

  // TODO: Move to separate type file
  public async runTask() {
    await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(this.selectedTask),
    });
  }

  // eslint-disable-next-line class-methods-use-this
  public async deleteJobs() {
    await fetch('/api/tasks', {
      method: 'DELETE',
    });
  }
}

</script>
