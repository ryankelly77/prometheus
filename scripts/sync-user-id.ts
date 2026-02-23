import prisma from '../src/lib/prisma';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';

const EMAIL = "ryan@pearanalytics.com";

async function main() {
  console.log(`Syncing user ID for ${EMAIL}...\n`);

  // Get the Supabase Auth user ID using service role
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Get all users from Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) {
    console.error("Error fetching Supabase auth users:", authError);
    process.exit(1);
  }

  const authUser = authData.users.find(u => u.email === EMAIL);

  if (!authUser) {
    console.log(`No Supabase Auth user found with email ${EMAIL}`);
    console.log("\nAvailable auth users:");
    authData.users.forEach(u => {
      console.log(`  - ${u.email} (id: ${u.id})`);
    });
    process.exit(1);
  }

  console.log(`Supabase Auth user ID: ${authUser.id}`);

  // Get the current userProfile
  const userProfile = await prisma.userProfile.findUnique({
    where: { email: EMAIL },
    include: { userOrganizations: true }
  });

  if (!userProfile) {
    console.log(`No userProfile found with email ${EMAIL}`);
    console.log("\nCreating userProfile with correct Supabase Auth ID...");

    // Create the user profile with the Supabase Auth ID
    await prisma.userProfile.create({
      data: {
        id: authUser.id,
        email: EMAIL,
        fullName: "Ryan Kelly",
      }
    });
    console.log("Created userProfile!");

    // Now link to organization
    const orgs = await prisma.organization.findMany();
    if (orgs.length > 0) {
      await prisma.userOrganization.create({
        data: {
          userId: authUser.id,
          organizationId: orgs[0].id,
          role: "SUPER_ADMIN",
          isActive: true,
        }
      });
      console.log(`Linked to organization: ${orgs[0].name}`);
    }

    return;
  }

  console.log(`Current userProfile ID: ${userProfile.id}`);

  if (userProfile.id === authUser.id) {
    console.log("\n✅ IDs already match! No sync needed.");
    return;
  }

  console.log("\n⚠️  IDs do not match! Syncing...");
  console.log(`  Old ID: ${userProfile.id}`);
  console.log(`  New ID: ${authUser.id}`);

  // Update the userProfile ID to match Supabase Auth
  // We need to:
  // 1. Create a new userProfile with the correct ID
  // 2. Update userOrganizations to point to new ID
  // 3. Delete the old userProfile

  // Start transaction
  await prisma.$transaction(async (tx) => {
    // Create new userProfile with correct ID
    await tx.userProfile.create({
      data: {
        id: authUser.id,
        email: userProfile.email,
        fullName: userProfile.fullName,
        avatarUrl: userProfile.avatarUrl,
        ssoProviderId: userProfile.ssoProviderId,
      }
    });

    // Update all userOrganizations to point to new ID
    for (const uo of userProfile.userOrganizations) {
      await tx.userOrganization.update({
        where: { id: uo.id },
        data: { userId: authUser.id }
      });
    }

    // Delete old userProfile
    await tx.userProfile.delete({
      where: { id: userProfile.id }
    });
  });

  console.log("\n✅ Successfully synced user IDs!");

  // Verify
  const updated = await prisma.userProfile.findUnique({
    where: { id: authUser.id },
    include: { userOrganizations: { include: { organization: true } } }
  });

  console.log("\nVerification:");
  console.log(`  User ID: ${updated?.id}`);
  console.log(`  Email: ${updated?.email}`);
  console.log(`  Organizations: ${updated?.userOrganizations.map(uo => uo.organization.name).join(", ")}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
