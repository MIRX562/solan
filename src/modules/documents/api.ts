import { Elysia, t } from 'elysia'
import { createDocument, createDocumentVersion, listDocumentVersions } from './service'

const documentParams = t.Object({ documentId: t.String({ minLength: 1 }) })

const documentContent = t.Object({
  contentType: t.String({ minLength: 1 }),
  storageKey: t.Optional(t.String({ minLength: 1 })),
  textContent: t.Optional(t.String()),
})

export const documentsApi = new Elysia({ name: 'documents-api' })
  .post('/documents', ({ body }) => createDocument(body), {
    body: t.Object({
      ownerType: t.String({ minLength: 1 }),
      ownerId: t.String({ minLength: 1 }),
      title: t.String({ minLength: 1 }),
      kind: t.String({ minLength: 1 }),
      ...documentContent.properties,
    }),
  })
  .get('/documents/:documentId/versions', ({ params }) => listDocumentVersions(params.documentId), {
    params: documentParams,
  })
  .post('/documents/:documentId/versions', ({ body, params }) => createDocumentVersion({
    ...body,
    documentId: params.documentId,
  }), {
    body: documentContent,
    params: documentParams,
  })