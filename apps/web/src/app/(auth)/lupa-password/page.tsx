import type { Metadata } from "next";
import { LupaForm } from "./lupa-form";

export const metadata: Metadata = { title: "Lupa Password — AkaLink" };

export default async function LupaPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ galat?: string }>;
}) {
  const { galat } = await searchParams;
  return <LupaForm linkGagal={galat === "1"} />;
}
