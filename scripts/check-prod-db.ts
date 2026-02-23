import prisma from '../src/lib/prisma';

async function main() {
  console.log("Checking production database...\n");

  // Check for ryan's user
  const user = await prisma.userProfile.findUnique({
    where: { email: "ryan@pearanalytics.com" },
    include: { userOrganizations: true }
  });

  console.log("User ryan@pearanalytics.com:");
  console.log(user ? JSON.stringify(user, null, 2) : "  NOT FOUND");

  // Check for organizations
  const orgs = await prisma.organization.findMany();
  console.log("\nOrganizations:");
  console.log(orgs.length > 0 ? JSON.stringify(orgs, null, 2) : "  NONE FOUND");

  // Check user-org links
  const links = await prisma.userOrganization.findMany();
  console.log("\nUserOrganization links:");
  console.log(links.length > 0 ? JSON.stringify(links, null, 2) : "  NONE FOUND");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
