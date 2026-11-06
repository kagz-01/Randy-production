import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getWorkspaceNavigation } from "./workspace-navigation.ts";

describe("getWorkspaceNavigation", () => {
  it("routes clients to their portal and client profile", () => {
    assert.deepEqual(getWorkspaceNavigation("client"), {
      workspacePath: "/portal",
      workspaceLabel: "Client Portal",
      profilePath: "/portal/profile",
      profileLabel: "Open client profile",
    });
  });

  it("routes staff to Studio without exposing Admin", () => {
    const navigation = getWorkspaceNavigation("staff");
    assert.equal(navigation.workspacePath, "/studio");
    assert.equal(navigation.workspaceLabel, "Studio");
    assert.equal(navigation.profilePath, "/studio/profile");
  });

  it("gives admins a distinct Admin entrance and retains their team profile", () => {
    const navigation = getWorkspaceNavigation("admin");
    assert.equal(navigation.workspacePath, "/admin");
    assert.equal(navigation.workspaceLabel, "Admin");
    assert.equal(navigation.profilePath, "/studio/profile");
  });

  it("uses the client-facing navigation for the presentation fallback user", () => {
    const navigation = getWorkspaceNavigation("admin", true);
    assert.equal(navigation.workspacePath, "/portal");
    assert.equal(navigation.profilePath, "/portal/profile");
  });
});
