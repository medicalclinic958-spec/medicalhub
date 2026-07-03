"use client";

import { LoaderCircle } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <div className="rounded-full bg-teal-50 p-4">
                <LoaderCircle
                    className="h-8 w-8 animate-spin text-teal-600"
                    strokeWidth={2}
                />
            </div>
        </div>
    );
}