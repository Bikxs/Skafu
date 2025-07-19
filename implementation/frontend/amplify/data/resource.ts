import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  // Project Management (stubbed domain)
  Project: a.model({
    name: a.string().required(),
    description: a.string(),
    status: a.enum(['active', 'inactive', 'archived']),
    templateId: a.string().required(),
    configuration: a.json(),
    owner: a.string().required(),
    collaborators: a.string().array(),
  }).authorization(allow => [
    // Owner can perform all operations on their projects
    allow.owner(),
    // Authenticated users can read all projects
    allow.authenticated().to(['read']),
    // Fallback: API key for development/testing
    allow.publicApiKey()
  ]),

  // Template Management (stubbed domain) 
  Template: a.model({
    name: a.string().required(),
    description: a.string(),
    version: a.string().required(),
    category: a.string().required(),
    tags: a.string().array(),
    configuration: a.json(),
    author: a.string().required(),
    downloads: a.integer().default(0),
    rating: a.float().default(0),
  }).authorization(allow => [
    // Author can perform all operations
    allow.owner('author'),
    // Authenticated users can read templates and update download counts
    allow.authenticated().to(['read', 'update']),
    // Fallback: API key for development/testing
    allow.publicApiKey()
  ]),

  // User profiles (for display purposes)
  UserProfile: a.model({
    username: a.string().required(),
    email: a.string().required(),
    displayName: a.string(),
    role: a.enum(['admin', 'developer', 'viewer']),
    preferences: a.json(),
  }).authorization(allow => [
    // Users can manage their own profile
    allow.owner(),
    // Authenticated users can read other profiles (for collaboration)
    allow.authenticated().to(['read']),
    // Fallback: API key for development/testing
    allow.publicApiKey()
  ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Primary: User Pool authentication (via referenceAuth)
    defaultAuthorizationMode: 'userPool',
    // Secondary: API Key for development/testing
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});