import { createApi } from "@reduxjs/toolkit/query/react";
import { mockDataBaseQuery } from "./baseQuery";

// Types for template management (stubbed)
export interface Template {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  configuration: {
    variables: { name: string; type: string; required: boolean; default?: unknown }[];
    dependencies: string[];
    infrastructure: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
  author: string;
  downloads: number;
  rating: number;
}

export interface TemplatesResponse {
  templates: Template[];
  totalCount: number;
}

export interface CreateTemplateRequest {
  name: string;
  description: string;
  category: string;
  tags: string[];
  configuration: Template['configuration'];
}

// RTK Query API definition for mock template data
export const templatesApi = createApi({
  reducerPath: 'templatesApi',
  baseQuery: mockDataBaseQuery,
  tagTypes: ['Templates'],
  endpoints: (builder) => ({
    // Get all templates (mock data)
    getTemplates: builder.query<TemplatesResponse, {
      page?: number;
      limit?: number;
      category?: string;
      tags?: string[];
    }>({
      query: (params) => ({
        url: '/templates',
        params,
      }),
      providesTags: ['Templates'],
    }),

    // Get single template (mock data)
    getTemplate: builder.query<Template, string>({
      query: (id) => `/templates/${id}`,
      providesTags: (result, error, id) => [{ type: 'Templates', id }],
    }),

    // Get template categories (mock data)
    getTemplateCategories: builder.query<{ categories: string[] }, void>({
      query: () => '/templates/categories',
      providesTags: ['Templates'],
    }),

    // Create template (mock)
    createTemplate: builder.mutation<Template, CreateTemplateRequest>({
      query: (newTemplate) => ({
        url: '/templates',
        method: 'POST',
        body: newTemplate,
      }),
      invalidatesTags: ['Templates'],
    }),

    // Update template (mock)
    updateTemplate: builder.mutation<Template, { id: string; updates: Partial<Template> }>({
      query: ({ id, updates }) => ({
        url: `/templates/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Templates', id }],
    }),

    // Delete template (mock)
    deleteTemplate: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/templates/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Templates'],
    }),
  }),
});

export const {
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useGetTemplateCategoriesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
} = templatesApi;