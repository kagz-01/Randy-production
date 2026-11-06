import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/admin")({
  component: () => <Navigate to="/admin" />,
});
