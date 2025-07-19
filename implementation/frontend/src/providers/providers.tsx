"use client";

import React from "react";
import { Provider } from "react-redux";
import { Authenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { store } from "@/store";
import { amplifyConfig } from "@/config/amplify";
import amplifyOutputs from "../../amplify_outputs.json";

// Configure Amplify with merged config (external Cognito + Amplify Data)
const mergedConfig = {
  ...amplifyConfig,
  Data: amplifyOutputs.data,
};

Amplify.configure(mergedConfig);

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider store={store}>
      <Authenticator.Provider>
        {children}
      </Authenticator.Provider>
    </Provider>
  );
}