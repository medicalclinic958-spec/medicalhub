"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { z } from "zod";
import { FormField, Input, Button, Alert } from "@/components/ui";

const schema = z.object({
  newPassword: z.string().min(8, "At least 8 characters")
    .regex(/[A-Z]/, "Must have uppercase").regex(/[0-9]/, "Must have number"),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, { message: "Passwords don't match", path: ["confirmPassword"] });

type Input = z.infer<typeof schema>;

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<Input>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Input) => {
    setLoading(true); setError("");
    try {
      await axios.post("/api/auth/reset-password", { token, newPassword: data.newPassword });
      router.push("/login?message=password_reset");
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Reset failed");
      setLoading(false);
    }
  };

  if (!token) return <Alert type="error">Invalid reset link. Please request a new one.</Alert>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <FormField label="New Password" required error={errors.newPassword?.message}>
        <Input type="password" {...register("newPassword")} className="bg-slate-800 border-slate-700 text-white" error={!!errors.newPassword} />
      </FormField>
      <FormField label="Confirm Password" required error={errors.confirmPassword?.message}>
        <Input type="password" {...register("confirmPassword")} className="bg-slate-800 border-slate-700 text-white" error={!!errors.confirmPassword} />
      </FormField>
      <Button type="submit" loading={loading} className="w-full">Set New Password</Button>
    </form>
  );
}
