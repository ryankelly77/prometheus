import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { AcceptInviteForm } from "./accept-invite-form";

interface AcceptInvitePageProps {
  params: Promise<{ token: string }>;
}

async function getInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      organization: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
    },
  });

  return invitation;
}

export default async function AcceptInvitePage({ params }: AcceptInvitePageProps) {
  const { token } = await params;
  const invitation = await getInvitation(token);

  if (!invitation) {
    notFound();
  }

  // Check if invitation is expired
  const isExpired = invitation.expiresAt < new Date();

  // Check if invitation was already accepted
  const isAccepted = !!invitation.acceptedAt;

  // Check if invitation was revoked
  const isRevoked = !!invitation.revokedAt;

  return (
    <AcceptInviteForm
      token={token}
      email={invitation.email}
      organizationName={invitation.organization.name}
      organizationLogo={invitation.organization.logoUrl}
      role={invitation.role}
      isExpired={isExpired}
      isAccepted={isAccepted}
      isRevoked={isRevoked}
    />
  );
}
