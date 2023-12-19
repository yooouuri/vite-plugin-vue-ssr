<template>
  <RouterView />

  <TestComponent v-if="false" />
</template>

<style>
body {
  background: green;
}
</style>

<script setup lang="ts">
import TestComponent from "@/TestComponent.vue";
</script>
