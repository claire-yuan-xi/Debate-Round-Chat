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
        <h1 className="text-3xl font-semibold tracking-tight">Round Chat</h1>
        <p className={`mt-2 ${muted}`}>
          A floating chat for you and your teammates during rounds.
        </p>
      </div>
      <LoginForm next={nextPath} />
    </main>
  );
}
