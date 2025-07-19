import { fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { fetchAuthSession } from "aws-amplify/auth";

// Base query for real observability API endpoints (API Gateway)
export const observabilityBaseQuery = fetchBaseQuery({
  baseUrl: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api/v1/observability`,
  prepareHeaders: async (headers) => {
    try {
      // Get Cognito JWT token for API Gateway authorization
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      headers.set('Content-Type', 'application/json');
      return headers;
    } catch (error) {
      console.error('Failed to prepare headers:', error);
      return headers;
    }
  },
});

// Base query for mock data (projects, templates) - no authentication needed
export const mockDataBaseQuery = fetchBaseQuery({
  baseUrl: '/api/mock', // This will be handled by Next.js API routes
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

// Custom base query with error handling for Amplify Data (future use)
export const amplifyDataBaseQuery = fetchBaseQuery({
  baseUrl: '', // Will be replaced with Amplify Data client logic
  prepareHeaders: async (headers) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      
      return headers;
    } catch (error) {
      console.error('Failed to prepare Amplify headers:', error);
      return headers;
    }
  },
});