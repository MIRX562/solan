# Projects Module

Owns clients, projects, requirements, proposal versions, revisions, deliverables, Kanban execution, handoffs, project documents, and project history.

Keep project commands and queries here. Expose HTTP routes through `src/server/api/projects.ts`; keep TanStack page routes thin.

Execution may start before proposal acceptance, but the project event history must record that state. Proposal acceptance updates tracked project value transactionally.
