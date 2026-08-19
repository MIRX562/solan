import { desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { newId } from '../../shared/ids'
import { document, documentVersion } from './schema'

export async function createDocument(input: {
  ownerType: string
  ownerId: string
  title: string
  kind: string
  contentType: string
  storageKey?: string
  textContent?: string
}) {
  const now = new Date()
  const documentId = newId()

  return db.transaction((transaction) => {
    const documentRecord = {
      id: documentId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      title: input.title,
      kind: input.kind,
      createdAt: now,
      updatedAt: now,
    }
    transaction.insert(document).values(documentRecord).run()

    const version = {
      id: newId(),
      documentId,
      version: 1,
      contentType: input.contentType,
      storageKey: input.storageKey,
      textContent: input.textContent,
      createdAt: now,
    }
    transaction.insert(documentVersion).values(version).run()
    return { document: documentRecord, version }
  })
}

export async function createDocumentVersion(input: {
  documentId: string
  contentType: string
  storageKey?: string
  textContent?: string
}) {
  const now = new Date()

  return db.transaction((transaction) => {
    const current = transaction.select().from(document).where(eq(document.id, input.documentId)).get()
    if (!current) return undefined

    const latest = transaction
      .select({ version: documentVersion.version })
      .from(documentVersion)
      .where(eq(documentVersion.documentId, input.documentId))
      .orderBy(desc(documentVersion.version))
      .get()
    const version = {
      id: newId(),
      documentId: input.documentId,
      version: (latest?.version ?? 0) + 1,
      contentType: input.contentType,
      storageKey: input.storageKey,
      textContent: input.textContent,
      createdAt: now,
    }
    transaction.insert(documentVersion).values(version).run()
    transaction.update(document).set({ updatedAt: now }).where(eq(document.id, input.documentId)).run()
    return version
  })
}

export async function listDocumentVersions(documentId: string) {
  return db
    .select()
    .from(documentVersion)
    .where(eq(documentVersion.documentId, documentId))
    .orderBy(desc(documentVersion.version))
    .all()
}