export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Basis</h1>
      <p>Back office infrastructure for AI agents.</p>
      <p>
        Modules: identity, rbac, audit, and time tracking. The data
        lives in one Postgres database you own.
      </p>
      <p>
        API: <code>/api/me</code>, <code>/api/orgs/[orgId]/roles</code>,{" "}
        <code>/api/orgs/[orgId]/projects</code>, and{" "}
        <code>/api/orgs/[orgId]/time-entries</code>.
      </p>
    </main>
  );
}
