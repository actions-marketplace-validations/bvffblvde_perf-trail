import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { HISTORY_TAG } from "../../_lib/history";

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return Response.json(
      { revalidated: false, message: "REVALIDATE_SECRET is not set" },
      { status: 503 },
    );
  }
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const a = Buffer.from(secret);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }
  revalidateTag(HISTORY_TAG, { expire: 0 });
  return Response.json({ revalidated: true });
}
