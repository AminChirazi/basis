"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut(): Promise<void> {
    await authClient.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  return (
    <button type="button" className="secondary" onClick={signOut}>
      Sign out
    </button>
  );
}
