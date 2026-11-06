import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/client")({
  component: () => <Navigate to="/portal" />,
});
