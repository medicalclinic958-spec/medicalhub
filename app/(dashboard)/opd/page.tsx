import { Metadata } from "next";
import { OPDClient } from "@/components/emr/opd-client";
import { Suspense } from "react";
import Loading from "@/components/Loading";
export const metadata: Metadata = { title: "OPD / EMR" };
export default function OPDPage() {
    return (
        <Suspense fallback={<Loading />}><OPDClient /></Suspense>);
}
