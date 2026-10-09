import { supabase } from "@/lib/supabase";

export const VOXA_MEDIA_BUCKET = "voxa-user-media";
const SIGNED_URL_TTL_SECONDS = 5 * 60;

export async function createPrivateMediaUrls(paths: string[]) {
  if (paths.length === 0) return {};
  const { data, error } = await supabase.storage
    .from(VOXA_MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return Object.fromEntries(data.map((item) => [item.path, item.signedUrl]));
}

export async function uploadPrivateMedia(path: string, file: File) {
  const { error } = await supabase.storage
    .from(VOXA_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) throw error;
}

export async function removePrivateMedia(path: string) {
  const { error } = await supabase.storage.from(VOXA_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}
