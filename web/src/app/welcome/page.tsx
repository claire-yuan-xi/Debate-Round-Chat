import { saveName } from "@/app/actions/auth";
import { requireMember, safeNext } from "@/lib/dal";
import { field, muted, primaryButton } from "@/components/ui";

export default async function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  const member = await requireMember();
  const { next } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {member.name ? "Change your name" : "What should teammates call you?"}
        </h1>
        <p className={`mt-2 ${muted}`}>This is the name on your messages.</p>
      </div>
      <form action={saveName} className="flex flex-col gap-3 text-sm">
        <input type="hidden" name="next" value={safeNext(typeof next === "string" ? next : undefined)} />
        <input
          name="name"
          required
          autoFocus
          maxLength={40}
          defaultValue={member.name ?? ""}
          autoComplete="nickname"
          className={field}
        />
        <button type="submit" className={primaryButton}>
          Save
        </button>
      </form>
    </main>
  );
}
