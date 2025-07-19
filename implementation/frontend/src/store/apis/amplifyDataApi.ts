// RTK Query API slice for Amplify Data (AppSync GraphQL)
// Handles mock data operations: Projects, Templates, User Profiles
// Uses API Key authorization and GraphQL mutations/queries

import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../../amplify/data/resource';

// Initialize Amplify Data client
const client = generateClient<Schema>();

// Types based on Amplify Data schema
export type Project = Schema['Project']['type'];
export type Template = Schema['Template']['type'];
export type UserProfile = Schema['UserProfile']['type'];

export type CreateProjectInput = {
  name: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  templateId: string;
  configuration?: Record<string, unknown>;
  owner: string;
  collaborators?: string[];
};

export type UpdateProjectInput = {
  id: string;
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'archived';
  templateId?: string;
  configuration?: Record<string, unknown>;
  collaborators?: string[];
};

export type CreateTemplateInput = {
  name: string;
  description?: string;
  version: string;
  category: string;
  tags?: string[];
  configuration?: Record<string, unknown>;
  author: string;
  downloads?: number;
  rating?: number;
};

export type UpdateTemplateInput = {
  id: string;
  name?: string;
  description?: string;
  version?: string;
  category?: string;
  tags?: string[];
  configuration?: Record<string, unknown>;
  downloads?: number;
  rating?: number;
};

export type CreateUserProfileInput = {
  username: string;
  email: string;
  displayName?: string;
  role?: 'admin' | 'developer' | 'viewer';
  preferences?: Record<string, unknown>;
};

export type UpdateUserProfileInput = {
  id: string;
  username?: string;
  email?: string;
  displayName?: string;
  role?: 'admin' | 'developer' | 'viewer';
  preferences?: Record<string, unknown>;
};

// RTK Query API slice using Amplify Data client
export const amplifyDataApi = createApi({
  reducerPath: 'amplifyDataApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Project', 'Template', 'UserProfile'],
  endpoints: (builder) => ({
    // Project operations
    getProjects: builder.query<Project[], void>({
      queryFn: async () => {
        try {
          const { data: projects } = await client.models.Project.list();
          return { data: projects };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['Project'],
    }),

    getProject: builder.query<Project, string>({
      queryFn: async (id) => {
        try {
          const { data: project } = await client.models.Project.get({ id });
          if (!project) {
            return { error: { status: 'NOT_FOUND', error: 'Project not found' } };
          }
          return { data: project };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    createProject: builder.mutation<Project, CreateProjectInput>({
      queryFn: async (newProject) => {
        try {
          const { data: project } = await client.models.Project.create(newProject);
          if (!project) {
            return { error: { status: 'CREATE_ERROR', error: 'Failed to create project' } };
          }
          return { data: project };
        } catch (error) {
          return { error: { status: 'CREATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['Project'],
    }),

    updateProject: builder.mutation<Project, UpdateProjectInput>({
      queryFn: async ({ id, ...updates }) => {
        try {
          const { data: project } = await client.models.Project.update({
            id,
            ...updates,
          });
          if (!project) {
            return { error: { status: 'UPDATE_ERROR', error: 'Failed to update project' } };
          }
          return { data: project };
        } catch (error) {
          return { error: { status: 'UPDATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Project', id }],
    }),

    deleteProject: builder.mutation<{ id: string }, string>({
      queryFn: async (id) => {
        try {
          await client.models.Project.delete({ id });
          return { data: { id } };
        } catch (error) {
          return { error: { status: 'DELETE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Project', id }],
    }),

    // Template operations
    getTemplates: builder.query<Template[], void>({
      queryFn: async () => {
        try {
          const { data: templates } = await client.models.Template.list();
          return { data: templates };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['Template'],
    }),

    getTemplate: builder.query<Template, string>({
      queryFn: async (id) => {
        try {
          const { data: template } = await client.models.Template.get({ id });
          if (!template) {
            return { error: { status: 'NOT_FOUND', error: 'Template not found' } };
          }
          return { data: template };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'Template', id }],
    }),

    createTemplate: builder.mutation<Template, CreateTemplateInput>({
      queryFn: async (newTemplate) => {
        try {
          const { data: template } = await client.models.Template.create(newTemplate);
          if (!template) {
            return { error: { status: 'CREATE_ERROR', error: 'Failed to create template' } };
          }
          return { data: template };
        } catch (error) {
          return { error: { status: 'CREATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['Template'],
    }),

    updateTemplate: builder.mutation<Template, UpdateTemplateInput>({
      queryFn: async ({ id, ...updates }) => {
        try {
          const { data: template } = await client.models.Template.update({
            id,
            ...updates,
          });
          if (!template) {
            return { error: { status: 'UPDATE_ERROR', error: 'Failed to update template' } };
          }
          return { data: template };
        } catch (error) {
          return { error: { status: 'UPDATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Template', id }],
    }),

    deleteTemplate: builder.mutation<{ id: string }, string>({
      queryFn: async (id) => {
        try {
          await client.models.Template.delete({ id });
          return { data: { id } };
        } catch (error) {
          return { error: { status: 'DELETE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'Template', id }],
    }),

    // User Profile operations
    getUserProfiles: builder.query<UserProfile[], void>({
      queryFn: async () => {
        try {
          const { data: profiles } = await client.models.UserProfile.list();
          return { data: profiles };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: ['UserProfile'],
    }),

    getUserProfile: builder.query<UserProfile, string>({
      queryFn: async (id) => {
        try {
          const { data: profile } = await client.models.UserProfile.get({ id });
          if (!profile) {
            return { error: { status: 'NOT_FOUND', error: 'User profile not found' } };
          }
          return { data: profile };
        } catch (error) {
          return { error: { status: 'FETCH_ERROR', error: String(error) } };
        }
      },
      providesTags: (result, error, id) => [{ type: 'UserProfile', id }],
    }),

    createUserProfile: builder.mutation<UserProfile, CreateUserProfileInput>({
      queryFn: async (newProfile) => {
        try {
          const { data: profile } = await client.models.UserProfile.create(newProfile);
          if (!profile) {
            return { error: { status: 'CREATE_ERROR', error: 'Failed to create user profile' } };
          }
          return { data: profile };
        } catch (error) {
          return { error: { status: 'CREATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: ['UserProfile'],
    }),

    updateUserProfile: builder.mutation<UserProfile, UpdateUserProfileInput>({
      queryFn: async ({ id, ...updates }) => {
        try {
          const { data: profile } = await client.models.UserProfile.update({
            id,
            ...updates,
          });
          if (!profile) {
            return { error: { status: 'UPDATE_ERROR', error: 'Failed to update user profile' } };
          }
          return { data: profile };
        } catch (error) {
          return { error: { status: 'UPDATE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'UserProfile', id }],
    }),

    deleteUserProfile: builder.mutation<{ id: string }, string>({
      queryFn: async (id) => {
        try {
          await client.models.UserProfile.delete({ id });
          return { data: { id } };
        } catch (error) {
          return { error: { status: 'DELETE_ERROR', error: String(error) } };
        }
      },
      invalidatesTags: (result, error, id) => [{ type: 'UserProfile', id }],
    }),
  }),
});

// Export hooks for components
export const {
  // Project hooks
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  
  // Template hooks
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  
  // User Profile hooks
  useGetUserProfilesQuery,
  useGetUserProfileQuery,
  useCreateUserProfileMutation,
  useUpdateUserProfileMutation,
  useDeleteUserProfileMutation,
} = amplifyDataApi;