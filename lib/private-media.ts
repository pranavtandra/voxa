import { supabase } from "@/lib/supabase";

export const VOXA_MEDIA_BUCKET = "voxa-user-media";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

/**
 * Creates a short-lived URL for an object in Voxa's private media bucket.
 * The storage SELECT policy permits signing only files owned by the current user.
 */
export async function createPrivateMediaUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(VOXA_MEDIA_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}
