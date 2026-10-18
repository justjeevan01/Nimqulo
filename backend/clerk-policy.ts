export type ClerkUser = { image_url?:string; public_metadata?:{approved?:unknown}; primary_email_address_id?:string; email_addresses?:{id:string;email_address:string;verification?:{status:string}}[];external_accounts?:{provider:string;email_address:string}[] };
export function approvedGoogleUser(user:ClerkUser){
  const email=user.email_addresses?.find(value=>value.id===user.primary_email_address_id&&value.verification?.status==="verified");
  return user.public_metadata?.approved===true&&!!email&&!!user.external_accounts?.some(account=>account.provider==="oauth_google"&&account.email_address.toLowerCase()===email.email_address.toLowerCase());
}
