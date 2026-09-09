import { z } from 'zod';
import { applyAssignmentsSchema, uploadCatalogSchema, createRequestSchema, updateRequestSchema, terminateEmployeeSchema } from './schema';

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

  // Apply Assignments (direct add/remove)
  assignments: {
    apply: {
      method: 'POST' as const,
      path: '/api/assignments/apply',
      input: applyAssignmentsSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
  },

  // Upload Catalog
  catalog: {
    upload: {
      method: 'POST' as const,
      path: '/api/uploadCatalog',
      input: uploadCatalogSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
  },

  // User roles import (ERP Excel)
  userRoles: {
    upload: {
      method: 'POST' as const,
      path: '/api/user-roles/upload',
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
  },

  imports: {
    catalog: {
      method: 'POST' as const,
      path: '/api/imports/catalog',
      responses: { 200: z.any(), 400: errorSchemas.validation, 403: errorSchemas.forbidden },
    },
    userRoles: {
      method: 'POST' as const,
      path: '/api/imports/user-roles',
      responses: { 200: z.any(), 400: errorSchemas.validation, 403: errorSchemas.forbidden },
    },
    employees: {
      method: 'POST' as const,
      path: '/api/imports/employees',
      responses: { 200: z.any(), 400: errorSchemas.validation, 403: errorSchemas.forbidden },
    },
    accessUsers: {
      method: 'POST' as const,
      path: '/api/imports/access-users',
      responses: { 200: z.any(), 400: errorSchemas.validation, 403: errorSchemas.forbidden },
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

  // Privilege Requests
  requests: {
    create: {
      method: 'POST' as const,
      path: '/api/requests',
      input: createRequestSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/requests',
      responses: {
        200: z.any(),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/requests/:requestId',
      input: updateRequestSchema,
      responses: {
        200: z.any(),
        400: errorSchemas.validation,
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
      },
    },
  },

  // Employee Termination
  employees: {
    terminate: {
      method: 'POST' as const,
      path: '/api/employees/:employeeId/terminate',
      input: terminateEmployeeSchema,
      responses: {
        200: z.any(),
        403: errorSchemas.forbidden,
        404: errorSchemas.notFound,
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
