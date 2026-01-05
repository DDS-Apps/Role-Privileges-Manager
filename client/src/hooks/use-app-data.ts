import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { User, InsertUser } from "@shared/schema";
import { z } from "zod";

// Fetch all data (Users, Roles, Companies)
export function useAppData() {
  return useQuery({
    queryKey: [api.data.get.path],
    queryFn: async () => {
      const res = await fetch(api.data.get.path);
      if (!res.ok) throw new Error("Failed to fetch app data");
      return api.data.get.responses[200].parse(await res.json());
    },
  });
}

// Create User
export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userData: InsertUser) => {
      const validated = api.users.create.input.parse(userData);
      const res = await fetch(api.users.create.path, {
        method: api.users.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.users.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create user");
      }
      return api.users.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.data.get.path] });
    },
  });
}

// Update User
export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertUser>) => {
      // Validate partial input
      const validated = api.users.update.input.parse(updates);
      const url = buildUrl(api.users.update.path, { id });
      
      const res = await fetch(url, {
        method: api.users.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
           const error = api.users.update.responses[400].parse(await res.json());
           throw new Error(error.message);
        }
        if (res.status === 404) throw new Error("User not found");
        throw new Error("Failed to update user");
      }
      return api.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.data.get.path] });
    },
  });
}

// Delete User
export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.users.delete.path, { id });
      const res = await fetch(url, {
        method: api.users.delete.method,
      });

      if (!res.ok) {
         if (res.status === 404) throw new Error("User not found");
         throw new Error("Failed to delete user");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.data.get.path] });
    },
  });
}
