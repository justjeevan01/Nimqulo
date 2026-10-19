type ApprovalUser = {
  approved?: unknown;
};

// Firebase custom claims are set only by the administrator/server. The API
// independently checks current approval, Google identity and account status.
export function isAccountApproved(user: ApprovalUser | null | undefined): boolean {
  return user?.approved === true;
}

export function getPostSignInRoute(user: ApprovalUser | null | undefined) {
  return isAccountApproved(user) ? "/profile-setup" as const : "/access-required" as const;
}
