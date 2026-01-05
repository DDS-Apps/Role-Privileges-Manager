import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { 
  BootstrapResponse, 
  CreateDelegationRequest, 
  CreateRequestBody,
  Delegation,
  PrivilegeRequest 
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

export function useCreateDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDelegationRequest & { actorId: string }) => {
      const res = await apiRequest("POST", "/api/delegations", data);
      if (!res.ok) throw new Error("Failed to create delegation");
      return res.json() as Promise<Delegation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useRevokeDelegation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actorId }: { id: string; actorId: string }) => {
      const res = await apiRequest("POST", `/api/delegations/${id}/revoke`, { actorId });
      if (!res.ok) throw new Error("Failed to revoke delegation");
      return res.json() as Promise<Delegation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRequestBody & { actorId: string }) => {
      const res = await apiRequest("POST", "/api/requests", data);
      if (!res.ok) throw new Error("Failed to create request");
      return res.json() as Promise<PrivilegeRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useApproveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actorId, comment }: { id: string; actorId: string; comment?: string }) => {
      const res = await apiRequest("POST", `/api/requests/${id}/approve`, { actorId, comment });
      if (!res.ok) throw new Error("Failed to approve request");
      return res.json() as Promise<PrivilegeRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useRejectRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, actorId, comment }: { id: string; actorId: string; comment?: string }) => {
      const res = await apiRequest("POST", `/api/requests/${id}/reject`, { actorId, comment });
      if (!res.ok) throw new Error("Failed to reject request");
      return res.json() as Promise<PrivilegeRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}
