import { createNeonAuth } from "@neon/auth/next/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
});

/** The signed-in user's id, or a redirect to sign-in. */
export async function getUserId() {
  await connection(); // render per request, so Neon Auth never reads cookies during prerender
  const { data: session } = await auth.getSession();
  if (!session?.user) redirect("/auth/sign-in");
  return session.user.id;
}
