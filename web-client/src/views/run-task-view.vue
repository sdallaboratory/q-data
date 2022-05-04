<template>
  <!-- <label for="task-name">First Name
    <input v-model="task.type" type="text" id="task-name" placeholder="Task Name">
  </label> -->
  <template>
    <div class="home">
      <ol>
        <li v-for="task in availableTasks" :key="task.name">{{ task }}</li>
      </ol>
    </div>
  </template>

  <select name="" id="">
    <option v-for="task in availableTasks" :key="task.name" :value="task">{{ task.name }}</option>
  </select>
  <template v-if="selectedTask">

    <Vue3JsonEditor v-model="selectedTask.params" :show-btns="true" :mode="'code'" />
    <button @click="runTask()">Run task</button>

    {{ selectedTask }}
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
  public availableTasks = [] as Task[];

  public selectedTask?: Task;

  public constructor() {
    super();
    fetch('/api/tasks')
      .then((response) => response.json())
      .then((tasks) => { this.availableTasks = tasks; });
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
}

</script>
