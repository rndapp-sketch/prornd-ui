import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // frappe-react-sdk's useFrappeGetCall/GetDoc/GetDocList take (…, swrKey, options):
      // the 3rd argument is the SWR *cache key*, not options. An object literal there
      // (e.g. { enabled: !!user } or { revalidateOnFocus: false }) types fine but makes
      // every such call share one global cache entry regardless of endpoint, so unrelated
      // requests are deduped away and return each other's data (intermittent blank/greyed
      // pages). Use `cond ? undefined : null` as the key and put options 4th.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name=/^useFrappeGet(Call|Doc|DocList)$/][arguments.2.type='ObjectExpression']",
          message:
            'The 3rd argument of this frappe-react-sdk hook is the SWR cache key, not options. Pass `cond ? undefined : null` (or undefined) as the key and put SWR options in the 4th argument.',
        },
        {
          selector:
            "CallExpression[callee.name='useFrappeGetDocCount'][arguments.3.type='ObjectExpression']",
          message:
            'The 4th argument of useFrappeGetDocCount is the SWR cache key, not options. Put SWR options in the 5th argument.',
        },
      ],
    },
  },
])
