# Clerk authentication

The custom Google button uses `useSSO` from `@clerk/expo`. Google remains the sign-in method; profile fields are currently display-only placeholders. The root `ClerkProvider` restores sessions using Clerk's `tokenCache` (SecureStore on native; Clerk's browser session on web). Expo Router guards the app group with both authentication and admin approval. Signing out removes access to the protected routes.

## Approval and the first screen after sign-in

After identity and user data finish loading, an approved account enters `/profile-setup` immediately. An unapproved account enters `/access-required`. There is no intervening welcome screen. Confirm opens `/home` without saving any profile data.

Approval is read exclusively from `user.publicMetadata.approved === true`. Missing values, `false`, strings such as `"true"`, and any flag in editable `unsafeMetadata` deny access. Accounts cannot reach `/home` or `/profile-setup` without admin approval. The profile screen makes no account writes.

To approve an account, open **Clerk Dashboard → Users → the user → Metadata → Public metadata** and merge this field into its existing JSON:

```json
{ "approved": true }
```

To leave an account pending or revoke approval, set `approved` to `false` or remove it. The updated value is checked on the next sign-in/user refresh. Never put approval in Unsafe metadata, and never approve an account from mobile code. Invitations and account creation do not automatically set this field. Current accounts without the explicit flag will see Access Required.

This is a client routing gate backed by admin-owned metadata, not a substitute for authorization on future backend APIs. Those APIs must independently verify identity and approval. See [Clerk's metadata trust model](https://clerk.com/docs/guides/users/extending).

## Local configuration

Use the existing Clerk application selected in the dashboard: `app_3KoisFY1IIKzxxwvMPxzoUyCYgG`. Do not provision another app or replace working keys.

Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in an ignored `.env` file, using that application's publishable key. `.env.example` lists the required variable. Never put a Clerk secret key into an `EXPO_PUBLIC_*` variable or mobile code.

Clerk CLI login/linking is separate from the running mobile integration. To manage this application from the CLI, run `npx -y clerk@latest auth login` in your terminal, followed by `npx -y clerk@latest link --app app_3KoisFY1IIKzxxwvMPxzoUyCYgG`. The mobile client does not need a `CLERK_SECRET_KEY`; the CLI doctor may report its absence because account administration needs server credentials.

In the Clerk dashboard:

- Enable Google under Social connections.
- Enable the Native API under Native applications.
- Register `triplyai://sso-callback` as an allowed native redirect URL. For local web testing, also register `http://localhost:8081/sso-callback` (use the actual port if different).
- Keep Clerk's sign-up restrictions/invitations configured for the pilot, and set the explicit Public metadata approval field for each account you approve. If Clerk rejects account creation before a session exists, the restricted-sign-up response also opens Access Required.

This flow handles Google sign-in and sign-up together. Configure required fields so Google supplies them. If the instance requires extra fields, MFA, or device verification, the screen reports the incomplete authentication without granting access; those continuation screens are not implemented yet.

Run `npx expo start` for local development. For a reliable native redirect, use a development build with the `triplyai` scheme rather than Expo Go. Rebuild after adding the SecureStore/config plugins. No Google native sign-in client IDs are needed for this browser-based SSO flow.

## Verify with a real account

1. While signed out, open `/home` and confirm the sign-in screen appears.
2. Select **Continue with Google**. Cancel and confirm the button becomes available again without an error.
3. Select a Google account with Public metadata `approved: true`. Confirm profile setup opens immediately. Press Confirm without filling any fields and verify Chats Home opens.
4. Reload the web page or restart the native app. Confirm the session is restored.
5. Select **Sign out** and confirm the sign-in screen appears and `/home` is inaccessible.
6. Sign in to an account with no approval flag (or `approved: false`) and confirm Access Required appears. Opening `/home` or `/profile-setup` directly must not bypass it. Also try a non-invited account and confirm the configured Clerk sign-up policy rejects it.

No test accounts are created automatically. Completing Google consent requires the account owner.

## Access-required screen

`/access-required` displays the not-approved state. A `sign_up_mode_restricted` response from Clerk's Google flow opens it automatically. Other authentication failures retain their existing error handling. The route itself does not set or change approval status.

**Contact Support** opens a draft email to `jeevanofficial1120@gmail.com` with the subject `Nimqulo account access`. If no email app is available, the address is shown on screen. **Return to Sign In** signs out an active session before navigating to `/`.

References: [Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart), [SSO hook](https://clerk.com/docs/reference/expo/native-hooks/use-sso), [Expo protected routes](https://docs.expo.dev/router/advanced/protected/).
