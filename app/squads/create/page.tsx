import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { CreateSquadForm } from "@/components/features/create-squad-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CreateSquadPage() {
  await requireUser();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Create Squad</h2>

      <Card>
        <CardHeader>
          <CardTitle>New Squad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CreateSquadForm />
          <Link href="/squads" className="text-xs text-mutedForeground hover:text-foreground">
            Back to Squad page
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
