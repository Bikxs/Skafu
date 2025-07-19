import { a, defineData, type ClientSchema } from '@aws-amplify/backend';

const schema = a.schema({
  // Error Events from EventBridge (real-time observability data)
  ErrorEvent: a.model({
    // Store complete EventBridge event payload as raw JSON
    eventPayload: a.json().required(),
  }).authorization(allow => [
    // Authenticated users can read error events (observability data)
    allow.authenticated().to(['read']),
    // API Key can create events (for EventBridge consumer to append)
    allow.publicApiKey().to(['create']),
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