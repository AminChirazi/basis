import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEFAULT_ROLES } from "../src/modules/rbac/roles";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { slug: "demo", name: "Demo Organization" },
  });

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

  const user = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: { email: "owner@example.com", name: "Demo Owner" },
  });

  const membership = await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: user.id, organizationId: org.id },
    },
    update: {},
    create: { userId: user.id, organizationId: org.id },
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

  console.log(`Seeded organization "${org.name}" with default roles.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
