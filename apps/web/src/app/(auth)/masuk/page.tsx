import type { Metadata } from "next";
import { MasukForm } from "./masuk-form";

export const metadata: Metadata = {
  title: "Masuk — AkaLink",
};

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ terdaftar?: string; reset?: string }>;
}) {
  const { terdaftar, reset } = await searchParams;
  return (
    <MasukForm baruTerdaftar={terdaftar === "1"} setelahReset={reset === "1"} />
  );
}
