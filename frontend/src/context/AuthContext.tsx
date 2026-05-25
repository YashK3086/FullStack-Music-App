"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Amplify } from "aws-amplify";
import { 
  signIn as amplifySignIn, 
  signUp as amplifySignUp, 
  confirmSignUp as amplifyConfirmSignUp, 
  signOut as amplifySignOut,
  fetchAuthSession as amplifyFetchAuthSession,
  getCurrentUser as amplifyGetCurrentUser
} from "aws-amplify/auth";

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_54eh2ktc8",
      userPoolClientId: "7c5g2vsd60npoc8oru031sqd6u"
    }
  }
});

interface User {
  username: string;
  userId: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  idToken: string | null;
  loading: boolean;
  isGuest: boolean;
  signIn: (username: string, password: string) => Promise<any>;
  signUp: (username: string, email: string, password: string) => Promise<any>;
  confirmSignUp: (username: string, code: string) => Promise<any>;
  signOut: () => Promise<void>;
  enableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkUserSession = async () => {
    try {
      const currentUser = await amplifyGetCurrentUser();
      const session = await amplifyFetchAuthSession();
      const token = session.tokens?.idToken?.toString() || null;
      
      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
        email: session.tokens?.idToken?.payload?.email as string
      });
      setIdToken(token);
      setIsGuest(false);
    } catch (error) {
      console.log("No active AWS session found:", error);
      setUser(null);
      setIdToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkUserSession();
  }, []);

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    try {
      const result = await amplifySignIn({ username, password });
      await checkUserSession();
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signUp = async (username: string, email: string, password: string) => {
    setLoading(true);
    try {
      const result = await amplifySignUp({
        username,
        password,
        options: {
          userAttributes: {
            email
          }
        }
      });
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const confirmSignUp = async (username: string, code: string) => {
    setLoading(true);
    try {
      const result = await amplifyConfirmSignUp({ username, confirmationCode: code });
      setLoading(false);
      return result;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await amplifySignOut();
      setUser(null);
      setIdToken(null);
      setIsGuest(false);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const enableGuestMode = () => {
    setIsGuest(true);
    setUser({
      username: "Guest Listener",
      userId: "guest-user-id",
      email: "guest@example.com"
    });
    // Send a mock token string so that the backend falls back to standard mock identification headers
    setIdToken("mock-guest-token");
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      idToken,
      loading,
      isGuest,
      signIn,
      signUp,
      confirmSignUp,
      signOut,
      enableGuestMode
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
