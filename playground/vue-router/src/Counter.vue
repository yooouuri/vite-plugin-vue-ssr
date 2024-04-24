<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
</script>

<template>
  {{ count }}

  <button @click="count++">Increment</button>
</template>
