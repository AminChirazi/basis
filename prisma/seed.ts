import "dotenv/config";
import { auth } from "../src/auth/better-auth";
import { prisma } from "../src/core/db";
import { DEFAULT_ROLES } from "../src/modules/rbac/roles";

// Demo credentials. Change these before using the seed for
// anything other than a local trial.
const DEMO_EMAIL = "owner@example.com";
const DEMO_PASSWORD = "basis-demo-password";

async function main(): Promise<void> {
  // 1. The owner user, created through Better Auth so it has real
  //    credentials and can sign in.
  const existingUser = await prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    select: { id: true },
  });
  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const signUp = await auth.api.signUpEmail({
      body: { email: DEMO_EMAIL, password: DEMO_PASSWORD, name: "Demo Owner" },
    });
    userId = signUp.user.id;
  }

  // 2. The organization this deployment serves.
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo Organization" },
  });

  // 3. Default roles.
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: {
        organizationId_key: { organizationId: org.id, key: role.key },
      },
      update: { name: role.name, description: role.description, ord: role.ord },
      create: {
        organizationId: org.id,
        key: role.key,
        name: role.name,
        description: role.description,
        ord: role.ord,
      },
    });
  }

  // 4. Membership plus the owner role for the demo user.
  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId, organizationId: org.id },
    },
    update: {},
    create: { userId, organizationId: org.id },
  });
  const ownerRole = await prisma.role.findUniqueOrThrow({
    where: { organizationId_key: { organizationId: org.id, key: "owner" } },
  });
  await prisma.membershipRole.upsert({
    where: {
      membershipId_roleId: {
        membershipId: membership.id,
        roleId: ownerRole.id,
      },
    },
    update: {},
    create: { membershipId: membership.id, roleId: ownerRole.id },
  });

  // 5. A demo project with a couple of time entries, so a fresh
  //    install has something to look at.
  const existingProject = await prisma.project.findFirst({
    where: { organizationId: org.id, name: "Website redesign" },
    select: { id: true },
  });
  if (!existingProject) {
    const project = await prisma.project.create({
      data: { organizationId: org.id, name: "Website redesign", code: "WEB" },
    });
    await prisma.timeEntry.createMany({
      data: [
        {
          organizationId: org.id,
          membershipId: membership.id,
          projectId: project.id,
          description: "Kickoff and discovery",
          startedAt: new Date("2026-05-04T09:00:00Z"),
          durationMinutes: 120,
          billable: true,
        },
        {
          organizationId: org.id,
          membershipId: membership.id,
          projectId: project.id,
          description: "Wireframes",
          startedAt: new Date("2026-05-05T10:00:00Z"),
          durationMinutes: 180,
          billable: true,
        },
      ],
    });
  }

  console.log(`Seeded organization "${org.name}".`);
  console.log(`Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
