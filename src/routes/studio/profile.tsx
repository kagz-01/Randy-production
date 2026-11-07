import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getStudioProfile, saveStudioProfile, type StudioProfile } from "@/lib/server/studio";

export const Route = createFileRoute("/studio/profile")({ component: StudioProfilePage });

type ProfileForm = {
  displayName: string;
  username: string;
  jobTitle: string;
  team: string;
  phone: string;
  bio: string;
};
type PendingAvatar = { contentType: string; base64: string };
const EMPTY_FORM: ProfileForm = {
  displayName: "",
  username: "",
  jobTitle: "",
  team: "",
  phone: "",
  bio: "",
};

function formFromProfile(profile: StudioProfile): ProfileForm {
  return {
    displayName: profile.display_name,
    username: profile.username,
    jobTitle: profile.job_title,
    team: profile.team,
    phone: profile.phone,
    bio: profile.bio,
  };
}

function StudioProfilePage() {
  const [profile, setProfile] = useState<StudioProfile | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [avatar, setAvatar] = useState<PendingAvatar | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getStudioProfile()
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setForm(formFromProfile(result));
      })
      .catch((cause) => {
        console.error("[studio-profile] Could not load profile", cause);
        if (active) setError("Your profile could not be loaded. Refresh and try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function chooseAvatar(file: File | undefined) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 1_500_000) {
      setError("Choose a JPG, PNG, or WebP photo smaller than 1.5 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the selected photo."));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the selected photo."));
      reader.readAsDataURL(file);
    }).catch((cause: unknown) => {
      console.error("[studio-profile] Could not read profile photo", cause);
      setError("That photo could not be read.");
      return null;
    });
    if (!dataUrl) return;
    setError(null);
    setAvatar({
      contentType: file.type,
      base64: dataUrl.slice(dataUrl.indexOf(",") + 1),
    });
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await saveStudioProfile({
        data: {
          ...form,
          avatar,
        },
      });
      const refreshed = await getStudioProfile();
      setProfile(refreshed);
      setForm(formFromProfile(refreshed));
      setAvatar(undefined);
      if (fileInput.current) fileInput.current.value = "";
      toast.success("Your Studio profile is saved.");
    } catch (cause) {
      console.error("[studio-profile] Could not save profile", cause);
      setError(cause instanceof Error ? cause.message : "Your profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const avatarPreview = avatar === null
    ? null
    : avatar
      ? `data:${avatar.contentType};base64,${avatar.base64}`
      : profile?.avatar_data_url ?? null;
  const displayName = form.displayName.trim() || profile?.email?.[0]?.toUpperCase() || "?";

  if (loading) {
    return <main className="shell py-16 text-sm text-mist">Loading your Studio profile…</main>;
  }

  if (!profile) {
    return (
      <main className="shell py-16">
        <h1 className="font-serif text-4xl text-paper">Profile unavailable</h1>
        <p role="alert" className="mt-3 text-sm text-red-300">{error ?? "We couldn’t load your Studio profile."}</p>
      </main>
    );
  }

  return (
    <main className="shell pb-16">
      <header className="border-b border-paper/10 pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-2">Studio account</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-paper md:text-4xl">Your profile</h1>
        <p className="mt-2 max-w-2xl text-sm text-mist">
          Set how the crew recognizes you across Studio. Your work email and access level are managed securely.
        </p>
      </header>

      <form onSubmit={saveProfile} className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.7fr)]">
        <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium text-paper">Full name <span className="text-blue-2">*</span></span>
              <Input
                autoComplete="name"
                required
                maxLength={80}
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                placeholder="The name your crew knows you by"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium text-paper">Username <span className="text-blue-2">*</span></span>
              <div className="flex min-h-11 items-center rounded-md border border-paper/10 bg-void/70 px-3 focus-within:border-blue/40">
                <span className="mr-1 text-sm text-mist">@</span>
                <input
                  autoComplete="username"
                  required
                  minLength={3}
                  maxLength={24}
                  pattern="[A-Za-z0-9][A-Za-z0-9._]{1,22}[A-Za-z0-9]"
                  value={form.username}
                  onChange={(event) => setForm((current) => ({ ...current, username: event.target.value.toLowerCase() }))}
                  placeholder="yourname"
                  className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-sm text-paper outline-none placeholder:text-mist/60"
                />
              </div>
              <span className="block text-[11px] text-mist">3–24 letters, numbers, dots, or underscores. Must be unique.</span>
            </label>

            <label className="space-y-2">
              <span className="block text-xs font-medium text-paper">Job title</span>
              <Input
                maxLength={80}
                value={form.jobTitle}
                onChange={(event) => setForm((current) => ({ ...current, jobTitle: event.target.value }))}
                placeholder="e.g. Production coordinator"
              />
            </label>
            <label className="space-y-2">
              <span className="block text-xs font-medium text-paper">Team</span>
              <Input
                maxLength={60}
                value={form.team}
                onChange={(event) => setForm((current) => ({ ...current, team: event.target.value }))}
                placeholder="e.g. Production"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium text-paper">Phone</span>
              <Input
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Optional work contact"
              />
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="block text-xs font-medium text-paper">About you</span>
              <textarea
                maxLength={500}
                rows={4}
                value={form.bio}
                onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
                placeholder="A short intro for your teammates"
                className="w-full resize-y rounded-md border border-paper/10 bg-void/70 px-3 py-2.5 text-sm text-paper placeholder:text-mist/60 focus:border-blue/40 focus:outline-none"
              />
              <span className="block text-right text-[11px] text-mist">{form.bio.length}/500</span>
            </label>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-paper">Profile photo</h2>
            <p className="mt-1 text-xs leading-relaxed text-mist">
              A clear photo helps your coworkers recognize you in the Studio.
            </p>
            <div className="mt-5 flex items-center gap-4">
              {avatarPreview ? (
                <img src={avatarPreview} alt={`${displayName}'s profile`} className="size-20 rounded-full border border-paper/10 object-cover" />
              ) : (
                <div className="grid size-20 place-items-center rounded-full border border-paper/10 bg-paper/5 font-serif text-3xl text-blue-2">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col items-start gap-2">
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label="Choose a profile photo"
                  className="sr-only"
                  onChange={(event) => void chooseAvatar(event.currentTarget.files?.[0])}
                />
                <Button type="button" variant="line" size="sm" className="min-h-11" onClick={() => fileInput.current?.click()}>
                  Choose photo
                </Button>
                {avatarPreview ? (
                  <button type="button" className="min-h-11 text-xs text-mist underline underline-offset-4 hover:text-paper" onClick={() => setAvatar(null)}>
                    Remove photo
                  </button>
                ) : null}
              </div>
            </div>
            <p className="mt-4 text-[10px] text-mist/75">JPG, PNG, or WebP · up to 1.5 MB · stored privately with your Studio profile</p>
          </section>

          <section className="rounded-xl border border-paper/10 bg-ink/75 p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-paper">Work account</h2>
            <dl className="mt-4 space-y-3">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mist">Email</dt>
                <dd className="mt-1 break-all text-sm text-paper">{profile.email ?? "Not available"}</dd>
                <p className={`mt-1 text-[10px] ${profile.email_verified ? "text-emerald-200" : "text-amber-200"}`}>
                  {profile.email_verified ? "Verified account" : "Email verification required"}
                </p>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-mist">Studio access</dt>
                <dd className="mt-1 text-sm capitalize text-paper">{profile.role}</dd>
                <p className="mt-1 text-[10px] text-mist">Assigned by Randy Production Admin</p>
              </div>
            </dl>
          </section>
        </aside>

        <div className="lg:col-span-2">
          {error ? <p role="alert" className="mb-3 text-sm text-red-300">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-mist">Your profile details are shared only inside the private Studio workspace.</p>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving profile…" : "Save profile"}
            </Button>
          </div>
        </div>
      </form>
    </main>
  );
}
