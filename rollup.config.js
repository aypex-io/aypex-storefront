import resolve from '@rollup/plugin-node-resolve'
import terser from '@rollup/plugin-terser'
import postcss from 'rollup-plugin-postcss'
import autoprefixer from 'autoprefixer'
import postcssnesting from 'postcss-nesting'
import pkg from './package.json'

export default [
  { // CSS
    input: './app/sass/main.scss',
    output: [{ file: './app/assets/stylesheets/aypex/storefront/aypex_storefront.min.css' }],
    plugins: [
      postcss({
        minimize: true,
        modules: false,
        extract: true,
        config: {
          plugins: [
            postcssnesting,
            autoprefixer
          ]
        }
      })
    ]
  },
  { // JavaScript
    input: pkg.module,
    output: {
      file: pkg.main,
      format: 'esm',
      inlineDynamicImports: true
    },
    plugins: [
      resolve(),
      terser({
        mangle: false,
        compress: false,
        format: {
          beautify: true,
          indent_level: 2
        }
      })
    ]
  },

  {
    input: pkg.module,
    output: {
      file: 'app/assets/javascripts/aypex_froentend.min.js',
      format: 'esm',
      inlineDynamicImports: true,
      sourcemap: true
    },
    plugins: [
      resolve(),
      terser({
        mangle: true,
        compress: true
      })
    ]
  }
]
