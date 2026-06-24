// app/(dashboard)/profile/page.tsx
import { Metadata } from "next";
import { ProfileClient } from "@/components/profile/profile-client";

export const metadata: Metadata = { title: "My Profile" };

export default function ProfilePage() {
    return <ProfileClient />;
}