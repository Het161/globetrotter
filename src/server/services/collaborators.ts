import "server-only";
import type { CollaboratorRole } from "@prisma/client";
import { db } from "@/server/db";
import type { CollaboratorDTO, UserDTO } from "@/server/dto";
import { NotFoundError, ValidationError } from "@/server/http/errors";
import { assertTripAccess } from "./trips";

export async function listCollaborators(
  tripId: string,
  user: Pick<UserDTO, "id" | "role">,
): Promise<CollaboratorDTO[]> {
  await assertTripAccess(tripId, user, "VIEW");

  const rows = await db.tripCollaborator.findMany({
    where: { tripId },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((row) => ({
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    avatarUrl: row.user.avatarUrl,
    role: row.role,
  }));
}

export async function addCollaborator(
  tripId: string,
  email: string,
  role: CollaboratorRole,
  user: Pick<UserDTO, "id" | "role">,
): Promise<CollaboratorDTO> {
  const { trip } = await assertTripAccess(tripId, user, "OWNER");

  const invitee = await db.user.findUnique({ where: { email } });
  if (!invitee) {
    throw new ValidationError("No GlobeTrotter account uses that email yet.", {
      email: "No GlobeTrotter account uses that email yet.",
    });
  }
  if (invitee.id === trip.userId) {
    throw new ValidationError("You already own this trip.", { email: "That's you." });
  }

  const row = await db.tripCollaborator.upsert({
    where: { tripId_userId: { tripId, userId: invitee.id } },
    update: { role },
    create: { tripId, userId: invitee.id, role },
    include: { user: true },
  });

  return {
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    avatarUrl: row.user.avatarUrl,
    role: row.role,
  };
}

export async function removeCollaborator(
  tripId: string,
  userId: string,
  user: Pick<UserDTO, "id" | "role">,
) {
  await assertTripAccess(tripId, user, "OWNER");

  const existing = await db.tripCollaborator.findUnique({
    where: { tripId_userId: { tripId, userId } },
  });
  if (!existing) throw new NotFoundError("They aren't on this trip.");

  await db.tripCollaborator.delete({ where: { tripId_userId: { tripId, userId } } });
  return { userId };
}
