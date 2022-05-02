<template>
  <!-- <label for="task-name">First Name
    <input v-model="task.type" type="text" id="task-name" placeholder="Task Name">
  </label> -->
  <button @click="runTask()">Run task</button>
  <button @click="runTask('browser')">Run browser task</button>
  <Vue3JsonEditor v-model="task" :show-btns="true" :mode="'code'" :expandedOnStart="true" />
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

@Options({
  components: {
    Vue3JsonEditor,
  },
})
export default class HomeView extends Vue {
  public task = { method: 'groups.search', params: { q: 'МГТУ' } };

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
