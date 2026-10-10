import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../endpoints/dashboard_GET.schema";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    placeholderData: (prev) => prev,
  });
}
