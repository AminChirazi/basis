export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Basis</h1>
      <p>Back office infrastructure for AI agents.</p>
      <p>
        Modules: identity, rbac, audit, time tracking, and invoicing.
        The data lives in one Postgres database you own.
      </p>
      <p>
        API under <code>/api/orgs/[orgId]</code>: <code>roles</code>,{" "}
        <code>projects</code>, <code>time-entries</code>,{" "}
        <code>invoices</code>, and{" "}
        <code>workflows/invoice-from-time-entries</code>, plus{" "}
        <code>/api/me</code>.
      </p>
      <p>
        For AI agents, an MCP server (<code>npm run mcp</code>) exposes
        the same operations as tools.
      </p>
    </main>
  );
}
