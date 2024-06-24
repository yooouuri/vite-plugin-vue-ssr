import { useSSRContext } from 'vue'
import { H3Event } from 'h3'

export function useH3Event(): H3Event {
  const ctx = useSSRContext()

  return ctx?.event
}
