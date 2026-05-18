export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <h1>Basis</h1>
      <p>Back office infrastructure for AI agents.</p>
      <p>
        v1 primitives: users, organizations, membership, roles, and an
        audit trail.
      </p>
      <p>
        API: <code>GET /api/me</code> and{" "}
        <code>GET|POST|DELETE /api/orgs/[orgId]/roles</code>.
      </p>
    </main>
  );
}
