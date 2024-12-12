<script setup lang="ts">
import { useH3Event } from 'vite-plugin-vue-ssr'
import { setCookie } from 'h3'

if (import.meta.env.SSR) {
  const event = useH3Event()

  setCookie(event, 'cookie-from', 'h3')
}
</script>

<template>
  Me love cookies (check your cookies, they may be gone)
</template>
