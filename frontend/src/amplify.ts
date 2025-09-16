// src/amplify.ts
// Initialize AWS Amplify (Auth only) for Cognito Hosted UI

import { Amplify } from "aws-amplify";
export {
  // handy helpers we'll use later
  signInWithRedirect,
  signOut,
  getCurrentUser,
  fetchAuthSession,
} from "aws-amplify/auth";

// Read envs from Vite (.env.local)
const region = import.meta.env.VITE_AWS_REGION as string;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID as string;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID as string;
const domainRaw = import.meta.env.VITE_COGNITO_DOMAIN as string;
const redirectSignIn = import.meta.env.VITE_REDIRECT_URI as string;
const redirectSignOut = import.meta.env.VITE_POST_LOGOUT_REDIRECT_URI as string;

// Amplify expects the domain WITHOUT "https://"
const domain = domainRaw.replace(/^https?:\/\//, "");

Amplify.configure({
  Auth: {
    Cognito: {
      region,
      userPoolId,
      userPoolClientId,
      loginWith: {
        oauth: {
          domain,
          scopes: ["openid", "email", "profile"],
          redirectSignIn: [redirectSignIn],
          redirectSignOut: [redirectSignOut],
          responseType: "code", // secure for SPAs (PKCE)
        },
      },
    },
  },
});
