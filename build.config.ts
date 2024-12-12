import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    {
      input: 'src/index.ts',
      outDir: 'dist',
    },
    {
      input: 'src/plugin/index.ts',
      outDir: 'dist/plugin',
    },
  ],
  externals: [/@unhead/],
  clean: true,
  declaration: true,
  rollup: {
    esbuild: {
      minify: true,
    },
  },
})
