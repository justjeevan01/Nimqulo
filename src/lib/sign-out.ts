// Keep navigation behind successful session revocation, including repeated taps.
export function createSignOutAction(
  isReady: () => boolean,
  revokeSession: () => Promise<void>,
  returnToAuth: () => void,
) {
  let pending: Promise<void> | undefined;

  return function signOut(): Promise<void> {
    if (pending) return pending;
    pending = (async () => {
      if (!isReady())
        throw new Error(
          "Your session is still loading. Please try again in a moment.",
        );
      await revokeSession();
      returnToAuth();
    })().finally(() => {
      pending = undefined;
    });
    return pending;
  };
}
