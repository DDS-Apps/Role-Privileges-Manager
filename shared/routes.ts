import { z } from 'zod';
import { createDelegationSchema, createRequestSchema, approveRejectSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  forbidden: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  // Bootstrap - get all data for frontend init
  bootstrap: {
    get: {
      method: 'GET' as const,
      path: '/api/bootstrap',
      responses: {
        200: z.any(), // BootstrapResponse
      },
    },
  },

  // Delegations
  delegations: {
    create: {
      method: 'POST' as const,
      path: '/api/delegations',
      input: createDelegationSchema.extend({
        actorId: z.string(), // The manager creating the delegation
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    revoke: {
      method: 'POST' as const,
      path: '/api/delegations/:id/revoke',
      input: z.object({
        actorId: z.string(),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
        403: errorSchemas.forbidden,
      },
    },
  },

  // Requests (privilege change requests)
  requests: {
    create: {
      method: 'POST' as const,
      path: '/api/requests',
      input: createRequestSchema.extend({
        actorId: z.string(),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/requests',
      responses: {
        200: z.any(),
      },
    },
    approve: {
      method: 'POST' as const,
      path: '/api/requests/:id/approve',
      input: approveRejectSchema.extend({
        actorId: z.string(),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
        403: errorSchemas.forbidden,
      },
    },
    reject: {
      method: 'POST' as const,
      path: '/api/requests/:id/reject',
      input: approveRejectSchema.extend({
        actorId: z.string(),
      }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
        403: errorSchemas.forbidden,
      },
    },
  },

  // Audit Log
  audit: {
    list: {
      method: 'GET' as const,
      path: '/api/audit',
      responses: {
        200: z.any(),
      },
    },
  },

  // Export
  export: {
    employee: {
      method: 'GET' as const,
      path: '/api/export/employee',
      responses: {
        200: z.any(), // Binary Excel file
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
