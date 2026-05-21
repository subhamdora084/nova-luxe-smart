import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin-login")({
  component: () => <Navigate to="/admin/login" replace />,
});
