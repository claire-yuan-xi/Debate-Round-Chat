import Link from "next/link";
import { redirect } from "next/navigation";
import { getMember, safeNext } from "@/lib/dal";
import { LoginForm } from "@/components/LoginForm";
import { muted } from "@/components/ui";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNext(typeof next === "string" ? next : undefined);
  if (await getMember()) redirect(nextPath);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Sidenotes</h1>
        <p className={`mt-2 ${muted}`}>
          Lightweight messaging in a small floating window, so you can stay in the conversation without leaving what you&apos;re doing.
        </p>
      </div>
      <LoginForm next={nextPath} />
      <Link href="/r/new" className={`text-sm underline ${muted}`}>
        Start a chat without an account
      </Link>
    </main>
  );
}
