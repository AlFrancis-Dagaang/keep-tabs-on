import { createNeonAuth } from "@neon/auth/next/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The signed-in user's id, or a redirect to sign-in. Cached so the layout and the page read the session once per request. */
export const getUserId = cache(async () => {
  await connection(); // render per request, so Neon Auth never reads cookies during prerender
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session.user.id;
});
