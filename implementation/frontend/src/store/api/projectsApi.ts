import { createApi } from "@reduxjs/toolkit/query/react";
import { mockDataBaseQuery } from "./baseQuery";

// Types for project management (stubbed)
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  templateId: string;
  createdAt: string;
  updatedAt: string;
  configuration: Record<string, unknown>;
  owner: string;
  collaborators: string[];
}

export interface ProjectsResponse {
  projects: Project[];
  totalCount: number;
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  templateId: string;
  configuration?: Record<string, unknown>;
}

// RTK Query API definition for mock project data
export const projectsApi = createApi({
  reducerPath: 'projectsApi',
  baseQuery: mockDataBaseQuery,
  tagTypes: ['Projects'],
  endpoints: (builder) => ({
    // Get all projects (mock data)
    getProjects: builder.query<ProjectsResponse, {
      page?: number;
      limit?: number;
      status?: string;
    }>({
      query: (params) => ({
        url: '/projects',
        params,
      }),
      providesTags: ['Projects'],
    }),

    // Get single project (mock data)
    getProject: builder.query<Project, string>({
      query: (id) => `/projects/${id}`,
      providesTags: (result, error, id) => [{ type: 'Projects', id }],
    }),

    // Create project (mock)
    createProject: builder.mutation<Project, CreateProjectRequest>({
      query: (newProject) => ({
        url: '/projects',
        method: 'POST',
        body: newProject,
      }),
      invalidatesTags: ['Projects'],
    }),

    // Update project (mock)
    updateProject: builder.mutation<Project, { id: string; updates: Partial<Project> }>({
      query: ({ id, updates }) => ({
        url: `/projects/${id}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Projects', id }],
    }),

    // Delete project (mock)
    deleteProject: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/projects/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Projects'],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} = projectsApi;