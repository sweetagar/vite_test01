<script lang="ts" setup>
import { ref } from 'vue';
const message = ref("Training Task App");
</script>

<template>
  <main>
    <h1>{{message}}</h1>
  </main>
</template>

<style scoped>
main {
  max-width: 800px;
  margin: 1rem auto;
}  
</style>
