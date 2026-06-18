"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { forgotPasswordSchema } from "@/lib/validations";
import { z } from "zod";
import { FormField, Input, Button, Alert } from "@/components/ui";

type ForgotInput = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotInput) => {
    setError("");
    try {
      await axios.post("/api/auth/forgot-password", data);
      setSuccess(true);
    } catch (e: unknown) {
      setError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Request failed");
    }
  };

  if (success) {
    return (
      <Alert type="success">
        If that email exists in our system, a password reset link has been sent. Check your inbox.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}
      <FormField label="Email address" required error={errors.email?.message}>
        <Input
          type="email"
          placeholder="your@email.com"
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:ring-blue-500"
          {...register("email")}
          error={!!errors.email}
        />
      </FormField>
      <Button type="submit" className="w-full">Send Reset Link</Button>
    </form>
  );
}
