import { Elysia, t } from 'elysia'
import {
  acceptProposal,
  createChangeRequest,
  createDeliverable,
  createHandoff,
  createKanbanCard,
  createKanbanColumn,
  createProject,
  createProposal,
  createRequirement,
  listChangeRequests,
  listDeliverables,
  listHandoffs,
  listKanbanCards,
  listKanbanColumns,
  listProjects,
  listProposals,
  listRequirements,
  projectStages,
  transitionProjectStage,
} from './service'

const createProjectBody = t.Object({
  client: t.Object({
    name: t.String({ minLength: 1 }),
    email: t.Optional(t.String({ format: 'email' })),
  }),
  name: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  currency: t.String({ minLength: 3, maxLength: 3 }),
  trackedValue: t.Optional(
    t.Object({
      amount: t.Integer({ minimum: 0 }),
      currency: t.String({ minLength: 3, maxLength: 3 }),
    }),
  ),
})

const projectIdParams = t.Object({
  projectId: t.String({ minLength: 1 }),
})

const createRequirementBody = t.Object({
  description: t.String({ minLength: 1 }),
  priority: t.Optional(t.String({ minLength: 1 })),
  notes: t.Optional(t.String()),
})

const createProposalBody = t.Object({
  scopeSummary: t.String({ minLength: 1 }),
  priceAmount: t.Integer({ minimum: 0 }),
  priceCurrency: t.String({ minLength: 3, maxLength: 3 }),
})

const proposalParams = t.Object({
  projectId: t.String({ minLength: 1 }),
  proposalId: t.String({ minLength: 1 }),
})

const createDeliverableBody = t.Object({
  name: t.Optional(t.String({ minLength: 1 })),
  description: t.Optional(t.String()),
  sourceType: t.Optional(t.Union([
    t.Literal('manual'),
    t.Literal('service'),
    t.Literal('product'),
  ])),
  sourceId: t.Optional(t.String({ minLength: 1 })),
  priceAmount: t.Optional(t.Integer({ minimum: 0 })),
  priceCurrency: t.Optional(t.String({ minLength: 3, maxLength: 3 })),
})

const createChangeRequestBody = t.Object({
  proposalId: t.Optional(t.String({ minLength: 1 })),
  deliverableId: t.Optional(t.String({ minLength: 1 })),
  changeNotes: t.String({ minLength: 1 }),
})

const stageBody = t.Object({
  stage: t.Union(projectStages.map((stage) => t.Literal(stage))),
})

const createColumnBody = t.Object({
  name: t.String({ minLength: 1 }),
  position: t.Integer({ minimum: 0 }),
})

const createCardBody = t.Object({
  columnId: t.String({ minLength: 1 }),
  deliverableId: t.Optional(t.String({ minLength: 1 })),
  title: t.String({ minLength: 1 }),
  description: t.Optional(t.String()),
  position: t.Integer({ minimum: 0 }),
})

const createHandoffBody = t.Object({
  deliveryNotes: t.Optional(t.String()),
  clientSignoff: t.Optional(t.String()),
  deliverableIds: t.Optional(t.Array(t.String({ minLength: 1 }))),
  documentIds: t.Optional(t.Array(t.String({ minLength: 1 }))),
})

export const projectsApi = new Elysia({ name: 'projects-api' })
  .get('/projects', () => listProjects())
  .post('/projects', ({ body }) => createProject(body), {
    body: createProjectBody,
  })
  .get('/projects/:projectId/requirements', ({ params }) => listRequirements(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/requirements', ({ body, params }) => createRequirement({
    ...body,
    projectId: params.projectId,
  }), {
    body: createRequirementBody,
    params: projectIdParams,
  })
  .get('/projects/:projectId/proposals', ({ params }) => listProposals(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/proposals', ({ body, params }) => createProposal({
    ...body,
    projectId: params.projectId,
  }), {
    body: createProposalBody,
    params: projectIdParams,
  })
  .post('/projects/:projectId/proposals/:proposalId/accept', ({ params }) => acceptProposal(
    params.projectId,
    params.proposalId,
  ), {
    params: proposalParams,
  })
  .get('/projects/:projectId/deliverables', ({ params }) => listDeliverables(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/deliverables', ({ body, params }) => createDeliverable({
    ...body,
    projectId: params.projectId,
  }), {
    body: createDeliverableBody,
    params: projectIdParams,
  })
  .get('/projects/:projectId/change-requests', ({ params }) => listChangeRequests(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/change-requests', ({ body, params }) => createChangeRequest({
    ...body,
    projectId: params.projectId,
  }), {
    body: createChangeRequestBody,
    params: projectIdParams,
  })
  .post('/projects/:projectId/stage', ({ body, params }) => transitionProjectStage(
    params.projectId,
    body.stage,
  ), {
    body: stageBody,
    params: projectIdParams,
  })
  .get('/projects/:projectId/kanban/columns', ({ params }) => listKanbanColumns(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/kanban/columns', ({ body, params }) => createKanbanColumn({
    ...body,
    projectId: params.projectId,
  }), {
    body: createColumnBody,
    params: projectIdParams,
  })
  .get('/projects/:projectId/kanban/cards', ({ params }) => listKanbanCards(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/kanban/cards', ({ body, params }) => createKanbanCard({
    ...body,
    projectId: params.projectId,
  }), {
    body: createCardBody,
    params: projectIdParams,
  })
  .get('/projects/:projectId/handoffs', ({ params }) => listHandoffs(params.projectId), {
    params: projectIdParams,
  })
  .post('/projects/:projectId/handoffs', ({ body, params }) => createHandoff({
    ...body,
    projectId: params.projectId,
  }), {
    body: createHandoffBody,
    params: projectIdParams,
  })