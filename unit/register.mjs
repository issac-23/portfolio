// Lets plain node load the app's TypeScript the way Next resolves it: relative
// imports without an extension ("./week") map to the .ts file next to them.
// Used only by `npm run test:unit`; the app itself is built by Next.
import { register } from 'node:module'

register('./resolve-ts.mjs', import.meta.url)
