'use client';

import { useGetProjectsQuery } from '@/store/apis/amplifyDataApi';
import { useAppSelector } from '@/store/hooks';
import { selectActiveSection } from '@/store/slices/uiSlice';

export default function Home() {
  // Test Redux integration
  const activeSection = useAppSelector(selectActiveSection);
  
  // Test Amplify Data API integration
  const { data: projects, isLoading, error } = useGetProjectsQuery();

  return (
    <div className="min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🎯 Skafu - Observability Platform
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Phase 3 Frontend MVP - Next.js + Amplify Gen2 + Redux Toolkit
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Redux Integration Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              🔄 Redux Integration
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Store Status:</span>
                <span className="text-green-600 font-semibold">✅ Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Active Section:</span>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  {activeSection}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Dual API Pattern:</span>
                <span className="text-green-600 font-semibold">✅ Ready</span>
              </div>
            </div>
          </div>

          {/* Amplify Data API Test */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              📊 Amplify Data API
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">API Status:</span>
                {isLoading ? (
                  <span className="text-yellow-600 font-semibold">⏳ Loading...</span>
                ) : error ? (
                  <span className="text-red-600 font-semibold">❌ Error</span>
                ) : (
                  <span className="text-green-600 font-semibold">✅ Connected</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Projects Found:</span>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  {projects?.length || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-300">Auth Mode:</span>
                <span className="bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded text-sm">
                  API Key
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            🏗️ Architecture Overview
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-3">
                🎯 Observability APIs (Real Data)
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• CloudWatch Metrics</li>
                <li>• CloudWatch Logs</li>
                <li>• X-Ray Traces</li>
                <li>• CloudWatch Alarms</li>
                <li>• Cost Explorer Data</li>
              </ul>
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                <strong>Auth:</strong> Cognito User Pool JWT → API Gateway
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-600 dark:text-green-400 mb-3">
                📋 Mock Data APIs (Stubbed)
              </h3>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• Project Management</li>
                <li>• Template Library</li>
                <li>• User Profiles</li>
                <li>• Settings & Preferences</li>
              </ul>
              <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                <strong>Auth:</strong> API Key → AppSync GraphQL
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="mt-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
          <h3 className="text-xl font-semibold mb-3">🚀 Next Steps</h3>
          <ul className="space-y-1 text-indigo-100">
            <li>• Set up @aws-amplify/ui-react Authenticator</li>
            <li>• Create observability dashboard components</li>
            <li>• Implement real-time data subscriptions</li>
            <li>• Build project management interface</li>
            <li>• Configure Cloudscape Design System</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
