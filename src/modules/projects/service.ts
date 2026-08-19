import { and, desc, eq, ne } from 'drizzle-orm'
import { db } from '../../db'
import { DomainError } from '../../shared/errors'
import { newId } from '../../shared/ids'
import type { Money } from '../../shared/money'
import { getProductSnapshot } from '../catalog/products/service'
import { getServiceSnapshot } from '../catalog/services/service'
import {
  changeRequest,
  client,
  deliverable,
  handoff,
  handoffItem,
  kanbanCard,
  kanbanColumn,
  project,
  projectEvent,
  proposal,
  requirement,
} from './schema'

export type CreateProjectInput = {
  client: {
    name: string
    email?: string
  }
  name: string
  description?: string
  currency: string
  trackedValue?: Money
}

export async function createProject(input: CreateProjectInput) {
  const now = new Date()
  const clientId = newId()
  const projectId = newId()

  return db.transaction((transaction) => {
    const existingClient = input.client.email
      ? transaction
          .select()
          .from(client)
          .where(eq(client.email, input.client.email))
          .get()
      : undefined

    const resolvedClientId = existingClient?.id ?? clientId

    if (!existingClient) {
      transaction.insert(client).values({
        id: clientId,
        name: input.client.name,
        email: input.client.email,
        createdAt: now,
        updatedAt: now,
      }).run()
    }

    const trackedValue = input.trackedValue ?? {
      amount: 0,
      currency: input.currency,
    }

    transaction.insert(project).values({
      id: projectId,
      clientId: resolvedClientId,
      name: input.name,
      description: input.description,
      stage: 'requirements',
      trackedValueAmount: trackedValue.amount,
      trackedValueCurrency: trackedValue.currency,
      createdAt: now,
      updatedAt: now,
    }).run()

    transaction.insert(projectEvent).values({
      id: newId(),
      projectId,
      type: 'project.created',
      payload: { stage: 'requirements' },
      occurredAt: now,
    }).run()

    return transaction.select().from(project).where(eq(project.id, projectId)).get()
  })
}

export async function listProjects() {
  return db.select().from(project).orderBy(desc(project.updatedAt)).all()
}

export async function createRequirement(input: {
  projectId: string
  description: string
  priority?: string
  notes?: string
}) {
  const now = new Date()

  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())

    const record = {
      id: newId(),
      projectId: input.projectId,
      description: input.description,
      priority: input.priority ?? 'medium',
      status: 'open',
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
    }

    transaction.insert(requirement).values(record).run()
    return record
  })
}

export async function listRequirements(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db.select().from(requirement).where(eq(requirement.projectId, projectId)).all()
}

export async function createProposal(input: {
  projectId: string
  scopeSummary: string
  priceAmount: number
  priceCurrency: string
}) {
  const now = new Date()

  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())

    const latest = transaction
      .select({ version: proposal.version })
      .from(proposal)
      .where(eq(proposal.projectId, input.projectId))
      .orderBy(desc(proposal.version))
      .get()

    const record = {
      id: newId(),
      projectId: input.projectId,
      version: (latest?.version ?? 0) + 1,
      scopeSummary: input.scopeSummary,
      priceAmount: input.priceAmount,
      priceCurrency: input.priceCurrency,
      status: 'draft',
      createdAt: now,
      updatedAt: now,
    }

    transaction.insert(proposal).values(record).run()
    return record
  })
}

export async function listProposals(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db
    .select()
    .from(proposal)
    .where(eq(proposal.projectId, projectId))
    .orderBy(desc(proposal.version))
    .all()
}

export async function acceptProposal(projectId: string, proposalId: string) {
  const now = new Date()

  return db.transaction((transaction) => {
    const projectRecord = assertProject(
      transaction.select().from(project).where(eq(project.id, projectId)).get(),
    )
    const selectedProposal = transaction
      .select()
      .from(proposal)
      .where(and(eq(proposal.id, proposalId), eq(proposal.projectId, projectId)))
      .get()

    if (!selectedProposal) {
      throw new DomainError('Proposal not found', 'PROPOSAL_NOT_FOUND')
    }

    if (selectedProposal.status === 'accepted') {
      return selectedProposal
    }

    transaction
      .update(proposal)
      .set({ status: 'rejected', updatedAt: now })
      .where(
        and(
          eq(proposal.projectId, projectId),
          ne(proposal.id, proposalId),
          ne(proposal.status, 'rejected'),
        ),
      )
      .run()

    transaction
      .update(proposal)
      .set({ status: 'accepted', updatedAt: now })
      .where(eq(proposal.id, proposalId))
      .run()

    transaction
      .update(project)
      .set({
        trackedValueAmount: selectedProposal.priceAmount,
        trackedValueCurrency: selectedProposal.priceCurrency,
        updatedAt: now,
      })
      .where(eq(project.id, projectId))
      .run()

    transaction.insert(projectEvent).values({
      id: newId(),
      projectId,
      type: 'proposal.accepted',
      payload: {
        proposalId,
        previousTrackedValue: {
          amount: projectRecord.trackedValueAmount,
          currency: projectRecord.trackedValueCurrency,
        },
        trackedValue: {
          amount: selectedProposal.priceAmount,
          currency: selectedProposal.priceCurrency,
        },
      },
      occurredAt: now,
    }).run()

    return { ...selectedProposal, status: 'accepted' as const }
  })
}

export async function createDeliverable(input: {
  projectId: string
  name?: string
  description?: string
  sourceType?: 'manual' | 'service' | 'product'
  sourceId?: string
  priceAmount?: number
  priceCurrency?: string
}) {
  const sourceType = input.sourceType ?? 'manual'
  if (sourceType !== 'manual' && !input.sourceId) {
    throw new DomainError('A catalog deliverable requires a source ID', 'MISSING_CATALOG_SOURCE')
  }
  if (sourceType === 'manual' && (!input.name || input.priceAmount === undefined || !input.priceCurrency)) {
    throw new DomainError('Manual deliverables require name, price, and currency', 'INVALID_MANUAL_DELIVERABLE')
  }

  const snapshot = sourceType === 'service'
    ? await getServiceSnapshot(input.sourceId!)
    : sourceType === 'product'
      ? await getProductSnapshot(input.sourceId!)
      : undefined
  const name = input.name ?? snapshot?.name
  const description = input.description ?? snapshot?.description
  const priceAmount = input.priceAmount ?? snapshot?.priceAmount
  const priceCurrency = input.priceCurrency ?? snapshot?.priceCurrency
  if (!name || priceAmount === undefined || !priceCurrency) {
    throw new DomainError('Deliverable pricing details are incomplete', 'INCOMPLETE_DELIVERABLE')
  }
  const now = new Date()

  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())

    const record = {
      id: newId(),
      projectId: input.projectId,
      name,
      description,
      sourceType,
      sourceId: input.sourceId,
      priceAmount,
      priceCurrency,
      status: 'planned',
      createdAt: now,
      updatedAt: now,
    }

    transaction.insert(deliverable).values(record).run()
    transaction.insert(projectEvent).values({
      id: newId(),
      projectId: input.projectId,
      type: 'deliverable.created',
      payload: {
        deliverableId: record.id,
        sourceType: record.sourceType,
        sourceId: record.sourceId,
      },
      occurredAt: now,
    }).run()

    return record
  })
}

export async function listDeliverables(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db
    .select()
    .from(deliverable)
    .where(eq(deliverable.projectId, projectId))
    .orderBy(desc(deliverable.updatedAt))
    .all()
}

export async function getDeliverableSnapshot(id: string) {
  const record = await db.select().from(deliverable).where(eq(deliverable.id, id)).get()
  if (!record) {
    throw new DomainError('Deliverable not found', 'DELIVERABLE_NOT_FOUND')
  }
  return {
    name: record.name,
    description: record.description ?? undefined,
    priceAmount: record.priceAmount,
    priceCurrency: record.priceCurrency,
  }
}

export async function createChangeRequest(input: {
  projectId: string
  proposalId?: string
  deliverableId?: string
  changeNotes: string
}) {
  if ((input.proposalId ? 1 : 0) + (input.deliverableId ? 1 : 0) !== 1) {
    throw new DomainError(
      'A change request must target exactly one proposal or deliverable',
      'INVALID_CHANGE_REQUEST_TARGET',
    )
  }

  const now = new Date()

  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())

    const targetVersions = input.proposalId
      ? transaction
          .select({ version: changeRequest.version })
          .from(changeRequest)
          .where(eq(changeRequest.proposalId, input.proposalId))
          .all()
      : transaction
          .select({ version: changeRequest.version })
          .from(changeRequest)
          .where(eq(changeRequest.deliverableId, input.deliverableId!))
          .all()

    if (input.proposalId) {
      const target = transaction
        .select()
        .from(proposal)
        .where(and(eq(proposal.id, input.proposalId), eq(proposal.projectId, input.projectId)))
        .get()
      if (!target) throw new DomainError('Proposal not found', 'PROPOSAL_NOT_FOUND')
    }

    if (input.deliverableId) {
      const target = transaction
        .select()
        .from(deliverable)
        .where(and(eq(deliverable.id, input.deliverableId), eq(deliverable.projectId, input.projectId)))
        .get()
      if (!target) throw new DomainError('Deliverable not found', 'DELIVERABLE_NOT_FOUND')
    }

    const record = {
      id: newId(),
      projectId: input.projectId,
      proposalId: input.proposalId,
      deliverableId: input.deliverableId,
      version: Math.max(0, ...targetVersions.map(({ version }) => version)) + 1,
      changeNotes: input.changeNotes,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    }

    transaction.insert(changeRequest).values(record).run()
    transaction.insert(projectEvent).values({
      id: newId(),
      projectId: input.projectId,
      type: 'change-request.created',
      payload: {
        changeRequestId: record.id,
        proposalId: record.proposalId,
        deliverableId: record.deliverableId,
        version: record.version,
      },
      occurredAt: now,
    }).run()

    return record
  })
}

export async function listChangeRequests(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db
    .select()
    .from(changeRequest)
    .where(eq(changeRequest.projectId, projectId))
    .orderBy(desc(changeRequest.createdAt))
    .all()
}

export const projectStages = [
  'requirements',
  'proposal',
  'execution',
  'handoff',
  'completed',
] as const

export async function transitionProjectStage(projectId: string, stage: typeof projectStages[number]) {
  const now = new Date()

  return db.transaction((transaction) => {
    const projectRecord = assertProject(
      transaction.select().from(project).where(eq(project.id, projectId)).get(),
    )
    const executionStartedBeforeProposal =
      stage === 'execution' &&
      !projectRecord.executionStartedBeforeProposal &&
      projectRecord.trackedValueAmount === 0

    transaction.update(project).set({
      stage,
      executionStartedBeforeProposal: executionStartedBeforeProposal || projectRecord.executionStartedBeforeProposal,
      updatedAt: now,
    }).where(eq(project.id, projectId)).run()

    transaction.insert(projectEvent).values({
      id: newId(),
      projectId,
      type: 'project.stage-changed',
      payload: {
        from: projectRecord.stage,
        to: stage,
        executionStartedBeforeProposal,
      },
      occurredAt: now,
    }).run()

    return { ...projectRecord, stage, executionStartedBeforeProposal: executionStartedBeforeProposal || projectRecord.executionStartedBeforeProposal }
  })
}

export async function createKanbanColumn(input: {
  projectId: string
  name: string
  position: number
}) {
  const now = new Date()
  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())
    const record = { id: newId(), ...input, createdAt: now, updatedAt: now }
    transaction.insert(kanbanColumn).values(record).run()
    return record
  })
}

export async function listKanbanColumns(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db.select().from(kanbanColumn).where(eq(kanbanColumn.projectId, projectId)).orderBy(kanbanColumn.position).all()
}

export async function createKanbanCard(input: {
  projectId: string
  columnId: string
  deliverableId?: string
  title: string
  description?: string
  position: number
}) {
  const now = new Date()
  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())
    const column = transaction.select().from(kanbanColumn).where(and(
      eq(kanbanColumn.id, input.columnId),
      eq(kanbanColumn.projectId, input.projectId),
    )).get()
    if (!column) throw new DomainError('Kanban column not found', 'KANBAN_COLUMN_NOT_FOUND')

    if (input.deliverableId) {
      const linkedDeliverable = transaction.select().from(deliverable).where(and(
        eq(deliverable.id, input.deliverableId),
        eq(deliverable.projectId, input.projectId),
      )).get()
      if (!linkedDeliverable) throw new DomainError('Deliverable not found', 'DELIVERABLE_NOT_FOUND')
    }

    const record = { id: newId(), ...input, createdAt: now, updatedAt: now }
    transaction.insert(kanbanCard).values(record).run()
    return record
  })
}

export async function listKanbanCards(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db.select().from(kanbanCard).where(eq(kanbanCard.projectId, projectId)).orderBy(kanbanCard.position).all()
}

export async function createHandoff(input: {
  projectId: string
  deliveryNotes?: string
  clientSignoff?: string
  deliverableIds?: string[]
  documentIds?: string[]
}) {
  const now = new Date()
  const deliverableIds = input.deliverableIds ?? []
  const documentIds = input.documentIds ?? []

  if (deliverableIds.length + documentIds.length === 0) {
    throw new DomainError('A handoff must contain at least one item', 'EMPTY_HANDOFF')
  }

  return db.transaction((transaction) => {
    assertProject(transaction.select().from(project).where(eq(project.id, input.projectId)).get())
    const projectDeliverables = deliverableIds.map((deliverableId) => transaction
      .select()
      .from(deliverable)
      .where(and(eq(deliverable.id, deliverableId), eq(deliverable.projectId, input.projectId)))
      .get())
    if (projectDeliverables.some((record) => !record)) {
      throw new DomainError('Deliverable not found', 'DELIVERABLE_NOT_FOUND')
    }

    const handoffRecord = {
      id: newId(),
      projectId: input.projectId,
      deliveryNotes: input.deliveryNotes,
      clientSignoff: input.clientSignoff,
      deliveredAt: now,
      createdAt: now,
      updatedAt: now,
    }
    transaction.insert(handoff).values(handoffRecord).run()

    for (const deliverableId of deliverableIds) {
      transaction.insert(handoffItem).values({
        id: newId(),
        handoffId: handoffRecord.id,
        deliverableId,
        label: 'deliverable',
      }).run()
    }
    for (const documentId of documentIds) {
      transaction.insert(handoffItem).values({
        id: newId(),
        handoffId: handoffRecord.id,
        documentId,
        label: 'document',
      }).run()
    }

    transaction.update(project).set({ stage: 'handoff', updatedAt: now }).where(eq(project.id, input.projectId)).run()
    transaction.insert(projectEvent).values({
      id: newId(),
      projectId: input.projectId,
      type: 'handoff.created',
      payload: { handoffId: handoffRecord.id, deliverableIds, documentIds },
      occurredAt: now,
    }).run()

    return handoffRecord
  })
}

export async function listHandoffs(projectId: string) {
  assertProject(await db.select().from(project).where(eq(project.id, projectId)).get())
  return db.select().from(handoff).where(eq(handoff.projectId, projectId)).orderBy(desc(handoff.deliveredAt)).all()
}

export function assertProject(projectRecord: typeof project.$inferSelect | undefined) {
  if (!projectRecord) {
    throw new DomainError('Project not found', 'PROJECT_NOT_FOUND')
  }

  return projectRecord
}