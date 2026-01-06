import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { 
  BootstrapResponse,
  ApplyAssignmentsRequest,
  Assignment,
  Privilege
} from "@shared/schema";

async function apiRequest(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

export function useBootstrapData() {
  return useQuery<BootstrapResponse>({
    queryKey: ["/api/bootstrap"],
    queryFn: async () => {
      const res = await fetch("/api/bootstrap");
      if (!res.ok) throw new Error("Failed to fetch data");
      return res.json();
    },
  });
}

export function useApplyAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ApplyAssignmentsRequest) => {
      const res = await apiRequest("POST", "/api/assignments/apply", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to apply assignments");
      }
      return res.json() as Promise<Assignment>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useUploadCatalog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { actorId: string; catalog: { module: string; function: string; role: string }[] }) => {
      const res = await apiRequest("POST", "/api/uploadCatalog", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to upload catalog");
      }
      return res.json() as Promise<{ privileges: Privilege[] }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}
