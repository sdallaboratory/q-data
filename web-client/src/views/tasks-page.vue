<template>
  <div class="home">
    <ol>
      <li v-for="task in tasks" :key="task">{{ task }}</li>
    </ol>
  </div>
</template>

<script lang="ts">
import { Options, Vue } from 'vue-class-component';

@Options({})
export default class HomeView extends Vue {
  public tasks = [] as string[];

  async mounted() {
    this.tasks = await fetch('/api/tasks').then((response) => response.json());
  }
}
</script>
