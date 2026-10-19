import type { Snapshot } from "../../backend/messenger-types";

export function pendingPeopleActivity(snapshot: Pick<Snapshot,"requests"|"invitations">) {
  const requests=snapshot.requests.filter(request=>request.direction==="incoming").length;
  const invitations=snapshot.invitations.filter(invitation=>invitation.status==="pending").length;
  return {requests,invitations,total:requests+invitations};
}
