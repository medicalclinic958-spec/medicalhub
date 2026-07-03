import { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Suspense } from "react";
import Loading from "@/components/Loading";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Loading />}>
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Set New Password</h1>
            <p className="text-slate-400 text-sm mt-1">Enter your new password below</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <ResetPasswordForm />
          </div>
          <p className="text-center mt-4">
            <Link href="/login" className="text-sm text-blue-400 hover:text-blue-300">← Back to login</Link>
          </p>
        </div>
      </div>
    </Suspense>
  );
}
