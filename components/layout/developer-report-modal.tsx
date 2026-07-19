"use client";

import { useState } from "react";
import axios from "axios";
import { LifeBuoy } from "lucide-react";
import { Modal, Button, FormField, Input, Select, Alert } from "@/components/ui";
import { toast } from "sonner";

interface DeveloperReportModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeveloperReportModal({ open, onClose }: DeveloperReportModalProps) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setSeverity("medium");
    setSource("");
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await axios.post("/api/developer-reports", {
        title,
        message,
        severity,
        source: source || undefined,
        page: typeof window !== "undefined" ? window.location.pathname : undefined,
      });

      toast.success("Report sent to developers");
      handleClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Failed to send report";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Report to Developers" size="md">
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Alert type="info">
          Send bugs, issues, or feedback directly to the ClinicHMS development team.
        </Alert>

        {error && <Alert type="error">{error}</Alert>}

        <FormField label="Title" required>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Brief summary of the issue"
            required
          />
        </FormField>

        <FormField label="Severity" required>
          <Select value={severity} onChange={(event) => setSeverity(event.target.value as typeof severity)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </FormField>

        <FormField label="Details" required>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe what happened, steps to reproduce, and what you expected..."
            rows={5}
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </FormField>

        <FormField label="Source / Screen (optional)">
          <Input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            placeholder="e.g. Billing, Appointments, Dashboard"
          />
        </FormField>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            <LifeBuoy className="w-4 h-4 mr-1.5" />
            {submitting ? "Sending..." : "Send Report"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
