"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "account_inactive" ? "Your account is not active. Contact admin." : null
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        console.log(result)
        setIsLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950 border border-red-800 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Email address
        </label>
        <input
          type="email"
          autoComplete="email"
          placeholder="doctor@clinic.com"
          className={cn(
            "w-full px-3 py-2.5 rounded-lg bg-slate-800 border text-white placeholder:text-slate-500",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all",
            errors.email ? "border-red-600" : "border-slate-700"
          )}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium text-slate-300">Password</label>
          <a
            href="/forgot-password"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Forgot password?
          </a>
        </div>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            className={cn(
              "w-full px-3 py-2.5 pr-10 rounded-lg bg-slate-800 border text-white placeholder:text-slate-500",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all",
              errors.password ? "border-red-600" : "border-slate-700"
            )}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && (
          <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rememberMe"
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
          {...register("rememberMe")}
        />
        <label htmlFor="rememberMe" className="text-sm text-slate-400">
          Remember me for 8 hours
        </label>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg",
          "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium",
          "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900",
          "transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        )}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
