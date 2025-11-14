import { Navigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";

export default function RequireCabinet({ children }: { children: JSX.Element }) {
  const { role } = useUserRole();

  if (role === null) return null; // loading

  if (role === "enterprise") return <Navigate to="/dashboard" replace />;

  return children;
}
