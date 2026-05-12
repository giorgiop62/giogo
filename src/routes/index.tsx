import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const user = await getCurrentUser();
    throw redirect({ to: user ? "/dashboard" : "/login" });
  },
});
