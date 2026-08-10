import type { Metadata } from "next";
import { MasukForm } from "./masuk-form";

export const metadata: Metadata = {
  title: "Masuk — AkaLink",
};

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ terdaftar?: string }>;
}) {
  const { terdaftar } = await searchParams;
  return <MasukForm baruTerdaftar={terdaftar === "1"} />;
}
