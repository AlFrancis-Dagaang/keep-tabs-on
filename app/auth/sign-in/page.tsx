"use client";

import { authClient } from "@/lib/auth/client";

export default function SignInPage() {
  return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="mb-4 text-2xl">Sign in to Keep tabs on</h1>
      <button
        type="button"
        className="rounded-lg border px-4 py-2"
        onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
      >
        Continue with Google
      </button>
    </main>
  );
}
