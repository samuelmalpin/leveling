import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { JoinSquadForm } from "@/components/features/join-squad-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function JoinSquadPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Join Squad</h2>

      <Card>
        <CardHeader>
          <CardTitle>Join with Invite Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <JoinSquadForm />
          <Link href="/squads" className="text-xs text-mutedForeground hover:text-foreground">
            Back to Squad page
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
