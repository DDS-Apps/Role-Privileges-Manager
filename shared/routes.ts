import { z } from 'zod';
import { insertUserSchema, insertRoleSchema, insertCompanySchema, users, roles, companies } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // Bulk Data (for the single page load)
  data: {
    get: {
      method: 'GET' as const,
      path: '/api/data',
      responses: {
        200: z.object({
          users: z.array(z.custom<typeof users.$inferSelect>()),
          roles: z.array(z.custom<typeof roles.$inferSelect>()),
          companies: z.array(z.custom<typeof companies.$inferSelect>()),
        }),
      },
    },
  },
  // Users
  users: {
    create: {
      method: 'POST' as const,
      path: '/api/users',
      input: insertUserSchema,
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/users/:id',
      input: insertUserSchema.partial(),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/users/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  // Export
  export: {
    download: {
      method: 'GET' as const,
      path: '/api/export/excel',
      responses: {
        200: z.any(), // Binary stream
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
