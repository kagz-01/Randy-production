export type WorkspaceNavigation = {
  workspacePath: "/portal" | "/studio" | "/admin";
  workspaceLabel: "Client Portal" | "Studio" | "Admin";
  profilePath: "/portal/profile" | "/studio/profile";
  profileLabel: "Open client profile" | "Open team profile";
};

export function getWorkspaceNavigation(
  role: string | null,
  isDevFallback = false,
): WorkspaceNavigation {
  const resolvedRole = isDevFallback ? "client" : role;
  if (resolvedRole === "admin") {
    return {
      workspacePath: "/admin",
      workspaceLabel: "Admin",
      profilePath: "/studio/profile",
      profileLabel: "Open team profile",
    };
  }
  if (resolvedRole === "staff") {
    return {
      workspacePath: "/studio",
      workspaceLabel: "Studio",
      profilePath: "/studio/profile",
      profileLabel: "Open team profile",
    };
  }
  return {
    workspacePath: "/portal",
    workspaceLabel: "Client Portal",
    profilePath: "/portal/profile",
    profileLabel: "Open client profile",
  };
}
