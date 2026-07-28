import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { 
  BootstrapResponse,
  ApplyAssignmentsRequest,
  Assignment,
  Privilege,
  PrivilegeRequest,
  CreateRequestInput,
  UpdateRequestInput,
  RequestStatus
} from "@shared/schema";

async function apiRequest(method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return res;
}

export function useBootstrapData() {
  return useQuery<BootstrapResponse>({
    queryKey: ["/api/bootstrap"],
    queryFn: async () => {
      const res = await fetch("/api/bootstrap", { credentials: "include" });
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

// Request hooks
export function useRequests(filters?: { managerId?: string; employeeId?: string; status?: RequestStatus; targetCompanyIds?: string[] }) {
  const params = new URLSearchParams();
  if (filters?.managerId) params.append("managerId", filters.managerId);
  if (filters?.employeeId) params.append("employeeId", filters.employeeId);
  if (filters?.status) params.append("status", filters.status);
  if (filters?.targetCompanyIds?.length) params.append("targetCompanyIds", filters.targetCompanyIds.join(","));
  
  const queryString = params.toString();
  const url = `/api/requests${queryString ? `?${queryString}` : ""}`;
  
  return useQuery<PrivilegeRequest[]>({
    queryKey: ["/api/requests", filters],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch requests");
      return res.json();
    },
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateRequestInput) => {
      const res = await apiRequest("POST", "/api/requests", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create request");
      }
      return res.json() as Promise<PrivilegeRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useUpdateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, adminId, data }: { requestId: string; adminId: string; data: UpdateRequestInput }) => {
      const res = await apiRequest("PATCH", `/api/requests/${requestId}?adminId=${adminId}`, data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update request");
      }
      return res.json() as Promise<PrivilegeRequest>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}

export function useTerminateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, adminId }: { employeeId: string; adminId: string }) => {
      const res = await apiRequest("POST", `/api/employees/${employeeId}/terminate?adminId=${adminId}`, {});
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to terminate employee");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bootstrap"] });
    },
  });
}
