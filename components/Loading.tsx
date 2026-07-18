"use client";

export default function Loading() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
            <div className="h-12 w-12 rounded-full bg-teal-100 animate-pulse" />
            <div className="h-2 w-24 bg-gray-200 rounded animate-pulse" />
            <div className="h-2 w-16 bg-gray-200 rounded animate-pulse" />
        </div>
    );
}