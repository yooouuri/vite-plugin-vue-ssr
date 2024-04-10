import { ModuleNode } from 'vite'

export function renderCssForSsr(mods: Set<ModuleNode>, styles = new Map<string, string>(), checkedComponents = new Set()) {
  for (const mod of mods) {
    if ((mod.file?.endsWith('.scss')
        || mod.file?.endsWith('.css')
        || mod.id?.includes('vue&type=style')) &&
      mod.ssrModule
    ) {
      styles.set(mod.id!, mod.ssrModule.default)
    }

    if (mod.importedModules.size > 0 && !checkedComponents.has(mod.id)) {
      checkedComponents.add(mod.id)

      renderCssForSsr(mod.importedModules, styles, checkedComponents)
    }
  }

  let result = ''

  styles.forEach((content, id) => {
    result = result.concat(`<style type="text/css" data-vite-dev-id="${id}">${content}</style>`)
  })

  return result
}
