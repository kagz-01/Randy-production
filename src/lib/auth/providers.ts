/**
 * Google sign-in providers shown by the client.
 *
 * The deployed app uses Better Auth's native Google provider. The App Builder
 * live preview keeps its brokered provider so its dynamic preview hostname
 * does not need to be registered as a Google OAuth redirect URI.
 */
export type AuthProvider = {
  providerId: "google";
  label: string;
};

export const AUTH_PROVIDERS: readonly AuthProvider[] = [
  { providerId: "google", label: "Google" },
];

export type GrokProvider = {
  providerId: "grok-google";
  idp: "google";
  label: "Google";
};

export const GROK_PROVIDERS: readonly GrokProvider[] = [
  { providerId: "grok-google", idp: "google", label: "Google" },
];
