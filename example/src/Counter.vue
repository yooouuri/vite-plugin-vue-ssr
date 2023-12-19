<script setup lang="ts">
import { onServerPrefetch } from 'vue'
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()

onServerPrefetch(() => {
  store.increment()
})
</script>

<template>
  <div>
    {{ store.count }}

    <button @click="store.increment">Increment</button>
  </div>
</template>
