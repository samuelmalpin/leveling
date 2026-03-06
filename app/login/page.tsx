import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div>
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-mutedForeground">
        New hunter? <Link className="text-primary" href="/signup">Create account</Link>
      </p>
    </div>
  );
}
