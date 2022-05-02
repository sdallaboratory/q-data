<template>
  <nav>
    <router-link to="/">Список задач</router-link> |
    <router-link to="/about">Запустить задачу</router-link> |
    <router-link to="/jobs">Администрирование задач</router-link> |
    <router-link to="/mongo-express">Администрирование данных</router-link>
  </nav>
  <router-view />
</template>

<style lang="scss">
html,
body,
#app {
  height: 100%;
  margin: 0;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  display: flex;
  flex-direction: column;
}

nav {
  padding: 30px;
  color: white;
  background-color: #2a2a2a;

  a {
    color: white;
    font-weight: bold;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
