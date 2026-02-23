import prisma from '../src/lib/prisma';

const USER_ID = "cf067cfe-fefe-4069-844f-b03d5819d96c";

async function main() {
  console.log("Simulating /api/auth/me query...\n");
  console.log(`Looking up userProfile with id: ${USER_ID}\n`);

  // This is the exact query from /api/auth/me
  const userProfile = await prisma.userProfile.findUnique({
    where: { id: USER_ID },
    include: {
      userOrganizations: {
        where: { isActive: true },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!userProfile) {
    console.log("❌ User profile NOT FOUND!");
    console.log("\nLet's check if the user exists at all...");

    const allUsers = await prisma.userProfile.findMany();
    console.log("\nAll userProfiles:");
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (id: ${u.id})`);
    });
    return;
  }

  console.log("✅ User profile found!");
  console.log(`  ID: ${userProfile.id}`);
  console.log(`  Email: ${userProfile.email}`);
  console.log(`  Name: ${userProfile.fullName}`);
  console.log(`\nOrganization memberships (userOrganizations):`);

  if (userProfile.userOrganizations.length === 0) {
    console.log("  ❌ NONE FOUND (with isActive: true)");

    // Check without the isActive filter
    const allMemberships = await prisma.userOrganization.findMany({
      where: { userId: USER_ID },
      include: { organization: true }
    });

    console.log("\n  All memberships (without isActive filter):");
    allMemberships.forEach(m => {
      console.log(`    - Org: ${m.organization.name}`);
      console.log(`      Role: ${m.role}`);
      console.log(`      isActive: ${m.isActive}`);
    });
  } else {
    userProfile.userOrganizations.forEach(m => {
      console.log(`  ✅ ${m.organization.name}`);
      console.log(`     Organization ID: ${m.organization.id}`);
      console.log(`     Role: ${m.role}`);
    });
  }

  // Now simulate what /api/auth/me would return
  console.log("\n--- Simulated /api/auth/me response ---");
  if (userProfile.userOrganizations.length === 0) {
    console.log('{ error: "No organization membership" }');
  } else {
    const response = {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        organizations: userProfile.userOrganizations.map((m) => ({
          id: m.organization.id,
          name: m.organization.name,
          slug: m.organization.slug,
          role: m.role,
        })),
      },
    };
    console.log(JSON.stringify(response, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
