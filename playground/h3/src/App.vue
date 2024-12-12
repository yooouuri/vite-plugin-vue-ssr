<script setup lang="ts">
import { useHead } from '@unhead/vue'

useHead({
  title: 'Example app, using vite-plugin-vue-ssr',
})
</script>

<template>
  <div>H3 examples, see Cookie.vue and Redirect.vue</div>

  <div>
    <RouterView />
  </div>

  <div>
    Navigating to the components won't do anything...
    <ul>
      <li><RouterLink to="/">Home</RouterLink></li>
      <li><RouterLink to="cookie">Cookie</RouterLink></li>
      <li><RouterLink to="redirect">Redirect</RouterLink></li>
    </ul>
  </div>
</template>

<style>
body {
  background: lightblue;
}
</style>
