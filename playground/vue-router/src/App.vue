<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: 'Example app, using vite-plugin-vue-ssr',
})
</script>

<template>
  <RouterView />
</template>

<style>
body {
  background: yellow;
}
</style>
