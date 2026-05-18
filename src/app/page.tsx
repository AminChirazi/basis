import Link from "next/link";
import { getCurrentUser } from "@/auth";
import { identityService } from "@/modules/identity";
import { invoicingService } from "@/modules/invoicing";
import { timeTrackingService } from "@/modules/timetracking";
import { createProjectAction } from "./actions";
import { AgentChat } from "./agent-chat";
import { SignOutButton } from "./sign-out-button";

function hours(minutes: number): string {
  return `${(minutes / 60).toFixed(1)}h`;
}

function money(cents: number, currency: string): string {
  return `${(cents / 100).toFixed(2)} ${currency}`;
}

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main>
        <h1>Basis</h1>
        <p className="muted">Self-hosted back office infrastructure.</p>
        <p>
          <Link href="/sign-in">Sign in</Link> to view the dashboard.
        </p>
      </main>
    );
  }

  const organizations = await identityService.listUserOrganizations(user.id);
  const org = organizations[0];

  if (!org) {
    return (
      <main>
        <div className="topbar">
          <h1>Basis</h1>
          <SignOutButton />
        </div>
        <p className="muted">
          Signed in as {user.name}. You are not a member of any
          organization yet.
        </p>
      </main>
    );
  }

  const [projects, timeEntries, invoices] = await Promise.all([
    timeTrackingService.listProjects(org.id),
    timeTrackingService.listTimeEntries({ organizationId: org.id }),
    invoicingService.listInvoices(org.id),
  ]);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const canManage =
    org.roles.includes("owner") || org.roles.includes("admin");

  return (
    <main>
      <div className="topbar">
        <h1>{org.name}</h1>
        <div className="row">
          <span className="muted">{user.name}</span>
          <SignOutButton />
        </div>
      </div>

      <AgentChat />

      <h2>Projects</h2>
      {projects.length === 0 ? (
        <p className="muted">No projects yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>{project.name}</td>
                <td>{project.code ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {canManage && (
        <form
          action={createProjectAction}
          className="row"
          style={{ marginTop: "0.75rem" }}
        >
          <input type="hidden" name="orgId" value={org.id} />
          <input name="name" placeholder="New project name" required />
          <button type="submit">Add project</button>
        </form>
      )}

      <h2>Time entries</h2>
      {timeEntries.length === 0 ? (
        <p className="muted">No time logged yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Project</th>
              <th>Duration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {timeEntries.map((entry) => (
              <tr key={entry.id}>
                <td>{entry.description}</td>
                <td>
                  {entry.projectId
                    ? (projectName.get(entry.projectId) ?? "")
                    : ""}
                </td>
                <td>{hours(entry.durationMinutes)}</td>
                <td>{entry.startedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Invoices</h2>
      {invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Number</th>
              <th>Client</th>
              <th>Status</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.number}</td>
                <td>{invoice.clientName}</td>
                <td>{invoice.status}</td>
                <td>{money(invoice.totalCents, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
