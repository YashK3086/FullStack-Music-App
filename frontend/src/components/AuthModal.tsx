"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Music, Eye, EyeOff, Loader } from "lucide-react";

export const AuthModal: React.FC = () => {
  const { signIn, signUp, confirmSignUp, enableGuestMode, loading } = useAuth();
  
  const [mode, setMode] = useState<"signin" | "signup" | "confirm">("signin");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmCode, setConfirmCode] = useState<string>("");
  
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signIn(username, password);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid username or password");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await signUp(username, email, password);
      setSuccessMsg("Check your email for a confirmation code!");
      setMode("confirm");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Sign up failed. Please try again.");
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await confirmSignUp(username, confirmCode);
      setSuccessMsg("Account confirmed successfully! You can now sign in.");
      setMode("signin");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Verification code is incorrect");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl glass-panel border border-[var(--border)] p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
        
        {/* Glow Background Elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-[var(--accent)] opacity-10 blur-3xl pointer-events-none"></div>

        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 rounded-2xl bg-[var(--accent)] text-white shadow-lg mb-3">
            <Music className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white font-sans">
            ANTIGRAVITY STREAM
          </h2>
          <p className="text-xs text-[var(--muted)] mt-1 font-medium uppercase tracking-widest font-mono">
            Smart Music Portal
          </p>
        </div>

        {/* Messaging alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/30 border border-red-500/50 text-red-200 text-xs font-semibold">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/50 text-emerald-200 text-xs font-semibold">
            {successMsg}
          </div>
        )}

        {/* Conditional forms based on mode */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1 relative">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl pl-4 pr-12 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg hover:shadow-[var(--accent)]/20"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : "Sign In to Account"}
            </button>
            
            <div className="flex items-center justify-center mt-4">
              <span className="text-xs text-zinc-500">
                New listener?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="text-[var(--accent)] hover:underline font-bold"
                >
                  Create credentials
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === "signup" && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Pick username"
                className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourname@example.com"
                className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8+ chars, upper, number, symbol"
                className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : "Sign Up and Verify"}
            </button>
            
            <div className="flex items-center justify-center mt-4">
              <span className="text-xs text-zinc-500">
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="text-[var(--accent)] hover:underline font-bold"
                >
                  Sign in here
                </button>
              </span>
            </div>
          </form>
        )}

        {mode === "confirm" && (
          <form onSubmit={handleConfirmSignUp} className="flex flex-col gap-4">
            <p className="text-xs text-zinc-400 text-center mb-2">
              We have sent a verification code to your email. Enter it below to activate your account.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Confirmation Code</label>
              <input
                type="text"
                required
                value={confirmCode}
                onChange={(e) => setConfirmCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full bg-zinc-900 border border-[var(--border)] rounded-xl px-4 py-3 text-sm text-white text-center font-mono tracking-widest focus:outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent)]/90 text-white font-bold text-sm rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : "Verify and Confirm"}
            </button>
            
            <div className="flex items-center justify-center mt-4">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className="text-xs text-zinc-400 hover:text-white underline font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* Guest Mode Divider */}
        <div className="relative flex py-4 items-center mt-4">
          <div className="flex-grow border-t border-zinc-800"></div>
          <span className="flex-shrink mx-4 text-xs font-mono text-zinc-600">OR</span>
          <div className="flex-grow border-t border-zinc-800"></div>
        </div>

        {/* Continue as Guest Button */}
        <button
          type="button"
          onClick={enableGuestMode}
          className="w-full py-3 bg-zinc-900 hover:bg-zinc-850 hover:text-white border border-[var(--border)] text-zinc-300 font-bold text-sm rounded-xl transition-colors active:scale-[0.98]"
        >
          Continue as Guest
        </button>

      </div>
    </div>
  );
};
