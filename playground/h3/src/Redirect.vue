<script setup lang="ts">
import { onServerPrefetch } from 'vue'
import { useH3Event } from 'vite-plugin-vue-ssr'
import { getRequestURL, sendRedirect } from 'h3'

// if (import.meta.env.SSR) {
//   const event = useH3Event()
//
//   const { host } = getRequestURL(event)
//
//   sendRedirect(event, `http://${host}/cookie`)
// }

onServerPrefetch(() => {
  const event = useH3Event()

  const { host } = getRequestURL(event)

  sendRedirect(event, `http://${host}/cookie`)
})
</script>

<template>
  Bye, try refreshing me (it even works in the onServerPrefetch hook)
</template>
