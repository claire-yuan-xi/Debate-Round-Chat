import Link from "next/link";
import { VerifyForm } from "@/components/VerifyForm";
import { muted } from "@/components/ui";

export default async function VerifyPage({ searchParams }: PageProps<"/auth/verify">) {
  const { token } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to Sidenotes</h1>
      {typeof token === "string" && token ? (
        <>
          <p className={muted}>Press the button to finish signing in on this device.</p>
          <VerifyForm token={token} />
        </>
      ) : (
        <p>
          This link is missing its code.{" "}
          <Link href="/login" className="underline">
            Get a new one
          </Link>
          .
        </p>
      )}
    </main>
  );
}
