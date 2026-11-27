/// <reference types="vite/client" />
// The reference repeats src/vite-env.d.ts on purpose: the test TypeScript config does not include it.
/**
 * V11-06 E7: the published privacy policy is the repository file docs/PRIVACY-POLICY.md, imported
 * as text at build time: one source for the repository and the /confidentialite page.
 */
import source from '../../docs/PRIVACY-POLICY.md?raw';

export default source;
