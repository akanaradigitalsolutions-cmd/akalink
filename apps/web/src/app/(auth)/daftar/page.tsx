import type { Metadata } from "next";
import { DaftarForm } from "./daftar-form";

export const metadata: Metadata = {
  title: "Daftar — AkaLink",
};

export default function DaftarPage() {
  return <DaftarForm />;
}
