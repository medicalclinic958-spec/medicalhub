"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginInput } from "@/lib/validations";
import { Eye, EyeOff, Loader2, Hospital, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Image from "next/image";
import { NEXT_PUBLIC_CLINIC_NAME, NEXT_PUBLIC_CLINIC_TAGLINE, NEXT_PUBLIC_LOGO_URL } from "@/constants/ClinicDetails";

const rotatingTexts = [
  "manage patients",
  "schedule appointments",
  "handle billing",
  "track medical records",
  "manage inventory",
];

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);

  // Rotating text animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsTextVisible(false);
      setTimeout(() => {
        setCurrentTextIndex((prev) => (prev + 1) % rotatingTexts.length);
        setIsTextVisible(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Handle URL errors
  useEffect(() => {
    const urlError = searchParams.get("error");
    if (urlError === "account_inactive") {
      toast.error("Your account is not active. Please contact admin.");
    }
  }, [searchParams]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
        setIsLoading(false);
        return;
      }

      toast.success("Login successful! Redirecting...");
      setTimeout(() => {
        router.push(callbackUrl);
        router.refresh();
      }, 1000);
    } catch {
      toast.error("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row relative overflow-hidden bg-white">
      {/* Left Section - Desktop */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-linear-to-br from-teal-800 via-teal-700 to-teal-900 min-h-screen">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <Image
            src="/clinic-bg.jpg"
            alt="Clinic Background"
            fill
            className="object-cover opacity-20"
            priority
            sizes="55vw"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-white w-full">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center overflow-hidden">
                {NEXT_PUBLIC_LOGO_URL ? (
                  <img src={NEXT_PUBLIC_LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <Hospital className="w-8 h-8 text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{NEXT_PUBLIC_CLINIC_NAME || 'ClinicHMS'}</h2>
              </div>
            </div>
          </div>

          {/* Animated Welcome Text */}
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
              Welcome back!
            </h1>
            <div className="h-12 overflow-hidden">
              <p className="text-xl text-teal-200">
                Please login to{" "}
                <span
                  className={cn(
                    "inline-block text-white font-semibold transition-all duration-500",
                    isTextVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  )}
                >
                  {rotatingTexts[currentTextIndex]}
                </span>
              </p>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="mt-12 flex gap-2">
            {rotatingTexts.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-1 rounded-full transition-all duration-300",
                  index === currentTextIndex
                    ? "w-8 bg-teal-300"
                    : "w-2 bg-teal-600"
                )}
              />
            ))}
          </div>
        </div>

        {/* Diagonal Cut */}
        <div className="absolute right-0 top-0 bottom-0 w-24 lg:w-32 z-20">
          <div
            className="absolute inset-0 bg-linear-to-br from-gray-50 to-white"
            style={{
              clipPath: 'polygon(100% 0, 0 0, 100% 100%)'
            }}
          />
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen relative bg-gray-50 lg:bg-white">
        <div className="relative w-full max-w-md">
          {/* Mobile/Tablet Hero Banner */}
          <div className="lg:hidden relative w-full h-56 sm:h-64 rounded-3xl overflow-hidden shadow-lg mb-6">
            {/* Background Image */}
            <Image
              src="/clinic-bg.jpg"
              alt="Clinic Background"
              fill
              className="object-cover"
              priority
              sizes="100vw"
            />
            {/* Gradient overlay - lighter at top so image reads, darker at bottom for text contrast */}
            <div className="absolute inset-0 bg-linear-to-b from-teal-900/30 via-teal-900/50 to-teal-950/90" />

            {/* Content over the image */}
            <div className="relative z-10 h-full flex flex-col justify-between p-5">
              {/* Logo + Name */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/25 shadow-md overflow-hidden shrink-0">
                  {NEXT_PUBLIC_LOGO_URL ? (
                    <img src={NEXT_PUBLIC_LOGO_URL} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Hospital className="w-6 h-6 text-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white leading-tight">
                    {NEXT_PUBLIC_CLINIC_NAME || 'ClinicHMS'}
                  </h1>
                  {NEXT_PUBLIC_CLINIC_TAGLINE && (
                    <p className="text-teal-200 text-xs">{NEXT_PUBLIC_CLINIC_TAGLINE}</p>
                  )}
                </div>
              </div>

              {/* Rotating welcome text */}
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight mb-1">
                  Welcome back!
                </h2>
                <div className="h-6 overflow-hidden">
                  <p className="text-sm text-teal-200">
                    Please login to{" "}
                    <span
                      className={cn(
                        "inline-block text-white font-semibold transition-all duration-500",
                        isTextVisible
                          ? "opacity-100 translate-y-0"
                          : "opacity-0 translate-y-4"
                      )}
                    >
                      {rotatingTexts[currentTextIndex]}
                    </span>
                  </p>
                </div>
                {/* Decorative dots */}
                <div className="mt-3 flex gap-1.5">
                  {rotatingTexts.map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        index === currentTextIndex
                          ? "w-6 bg-teal-300"
                          : "w-1.5 bg-white/30"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Card - Mobile/Tablet */}
          <div className="lg:bg-transparent bg-white rounded-2xl p-6 sm:p-8 shadow-xl lg:shadow-none border lg:border-0 border-gray-100">
            {/* Form Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Sign in
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="doctor@clinic.com"
                  className={cn(
                    "w-full px-4 py-3 rounded-xl border-2 text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none transition-all duration-200 bg-white",
                    errors.email
                      ? "border-red-400 bg-red-50"
                      : "border-gray-200 focus:border-teal-500"
                  )}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      "w-full px-4 py-3 pr-12 rounded-xl border-2 text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none transition-all duration-200 bg-white",
                      errors.password
                        ? "border-red-400 bg-red-50"
                        : "border-gray-200 focus:border-teal-500"
                    )}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-teal-500 duration-200" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1.5 ml-1">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-3 px-6 rounded-xl cursor-pointer group",
                  "bg-teal-600 hover:bg-teal-700 active:bg-teal-800",
                  "text-white font-medium",
                  "transition-all duration-200",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ChevronRight className="w-5 h-5 transition-transform duration-200 group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer - Mobile/Tablet */}
          <p className="text-center text-gray-400 text-xs mt-6">
            &copy; {new Date().getFullYear()} {NEXT_PUBLIC_CLINIC_NAME || 'ClinicHMS'}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}