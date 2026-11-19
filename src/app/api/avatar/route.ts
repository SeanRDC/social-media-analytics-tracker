import { getDb } from "@/db";
import { getAvatar } from "@/lib/avatar";
import { getSession } from "@/lib/dal";

/** The signed-in person's own profile photo. Never anyone else's, and never cached by shared caches. */
export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Not found", { status: 404 });
  const photo = await getAvatar(getDb(), session.user.id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Blob([photo.bytes as BlobPart], { type: photo.mime }), {
    headers: {
      "Content-Type": photo.mime,
      // the URL carries ?v=<saved time>, so a new photo gets a new URL
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
