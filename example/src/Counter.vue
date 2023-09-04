<script setup lang="ts">
import { onServerPrefetch, useSSRContext } from 'vue'
import { useCounterStore } from '@/stores/counter'

const store = useCounterStore()

onServerPrefetch(() => {
  store.increment()
})

if (import.meta.env.SSR) {
  const { response } = useSSRContext()
  
  console.log({ response })
}
</script>

<template>
  {{ store.count }}

  <button @click="store.increment">Increment</button>
</template>
