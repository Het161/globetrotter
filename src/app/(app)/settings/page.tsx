import type { Metadata } from "next";
import { requireUser } from "@/server/auth/session";
import { listSavedCities } from "@/server/services/cities";
import { PageHeader } from "@/components/layout/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { ChangePasswordForm, DangerZone } from "@/components/settings/security-forms";
import { SavedCities } from "@/components/settings/saved-cities";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const saved = await listSavedCities(user.id);

  return (
    <>
      <PageHeader
        eyebrow="Your account"
        title="Settings"
        description="Profile, preferences and the places you've saved."
      />

      <div className="max-w-3xl space-y-6">
        <ProfileForm user={user} />
        <SavedCities initial={saved} />
        <ChangePasswordForm />
        <DangerZone />
      </div>
    </>
  );
}
