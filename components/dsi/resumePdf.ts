import type { PDFDocumentProxy } from 'pdfjs-dist'

export const RESUME_PDF = '/resume.pdf'

// The document and its worker are kept on purpose, for the rest of the page session.
let doc: Promise<PDFDocumentProxy | null> | undefined

/**
 * Opens the resume once and hands the same document to both screens. pdf.js
 * and its worker are a few hundred kB, so they are imported here, on demand,
 * and the menu never pays for them. Resolves to null on any failure: the
 * preview is a nicety, and the cover stands in without a word.
 */
export function loadResume(): Promise<PDFDocumentProxy | null> {
  doc ??= (async () => {
    let worker: Worker | undefined
    try {
      const pdfjs = await import('pdfjs-dist')
      // A worker constructed from the URL, not a workerSrc string: webpack then
      // bundles the worker as a module, where a plain asset fails to minify.
      worker = new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), { type: 'module' })
      pdfjs.GlobalWorkerOptions.workerPort = worker
      // verbosity 0: pdf.js reports its own warnings through console.
      return await pdfjs.getDocument({ url: RESUME_PDF, verbosity: 0 }).promise
    } catch {
      // Let a later open try again rather than caching the failure.
      worker?.terminate()
      doc = undefined
      return null
    }
  })()
  return doc
}
