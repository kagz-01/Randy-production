import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/studio/receipts")({
  component: () => <Navigate to="/admin/receipts" />,
});
