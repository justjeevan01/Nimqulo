type ApprovalUser = {
  publicMetadata?: Record<string, unknown> | null;
};

// Public metadata is readable by the app but writable only by Clerk administrators/server code.
// Missing or malformed approval never grants access. Editable unsafeMetadata is not consulted.
export function isAccountApproved(user: ApprovalUser | null | undefined): boolean {
  return user?.publicMetadata?.approved === true;
}

export function getPostSignInRoute(user: ApprovalUser | null | undefined) {
  return isAccountApproved(user) ? "/profile-setup" as const : "/access-required" as const;
}
