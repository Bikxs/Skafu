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
  }).authorization(allow => [allow.publicApiKey()]),

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
  }).authorization(allow => [allow.publicApiKey()]),

  // User profiles (for display purposes)
  UserProfile: a.model({
    username: a.string().required(),
    email: a.string().required(),
    displayName: a.string(),
    role: a.enum(['admin', 'developer', 'viewer']),
    preferences: a.json(),
  }).authorization(allow => [allow.publicApiKey()]),
}).authorization(allow => [allow.publicApiKey()]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    // Using API Key for now since we're working with external Cognito pool
    // TODO: Configure User Pool authentication once we establish proper connection
    defaultAuthorizationMode: 'apiKey',
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});