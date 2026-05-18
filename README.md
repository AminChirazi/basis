# Basis

Building blocks for the back office.

Basis is an open source back office platform with a built-in framework
for customization. It lets you build the internal tools you run your
company on, time tracking, invoicing, permissions and the operational
core, without reinventing the boring parts and without renting a stack
of SaaS.

## The shift

Software is radically cheaper to build, so teams are starting to build
their own internal tools instead of renting a stack of SaaS that only
almost fits: HubSpot, billing tools, time trackers, the lot.

But the back office is harder than it looks. Even with AI and agents,
teams underestimate the complexity of time tracking, invoicing,
payments, and permissions. Building it yourself is appealing right up
until you are deep in it.

## How it works

Basis is modular. Each operational primitive is a self-contained
module that owns its data model and exposes a service as its only
public surface:

- **identity**: users, organizations, and membership
- **rbac**: roles and access control
- **audit**: an append-only trail of every change
- **timetracking**: projects and the time logged against them
- **invoicing**: invoices, line items, and status

Modules sit on a thin core (database, HTTP, pluggable auth) and are
opinionated about the parts that barely differ between companies. The
parts that do differ, your workflows and integrations, are adapters
on top, over a REST and MCP surface. You build your own UI, including
agent-driven ones, and the data lives in one Postgres database you own.

Authentication is self-hosted by default with Better Auth, in that
same database, so there is no auth vendor to depend on. Auth0, Clerk,
or corporate SSO plug in through the auth adapter instead.

Modules compose through two thin core layers. **Links** associate
records across modules without coupling their schemas. **Workflows**
run multi-step operations with automatic rollback: the bundled
`invoice-from-time-entries` workflow turns billable time entries into
an invoice and links them, undoing every step if any one fails.

## For AI agents

Basis ships an MCP server (`npm run mcp`). It exposes the same
operations as tools, so an AI agent can list and create projects,
log time, run workflows, and read the audit trail directly, over
the Model Context Protocol.

## Status

Early, and built in the open. We're validating the direction with
real users before going deep. If it resonates, **star the repo**.
That's how we'll know to keep going.

## License

MIT
