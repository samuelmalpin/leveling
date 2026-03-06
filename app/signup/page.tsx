import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createClient } from "@/lib/supabase/server";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div>
      <AuthForm mode="signup" />
      <p className="mt-4 text-center text-sm text-mutedForeground">
        Already have an account? <Link className="text-primary" href="/login">Login</Link>
      </p>
    </div>
  );
}
