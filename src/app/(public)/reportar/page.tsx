import type { Metadata } from "next";
import { ReportWizard } from "@/components/report/ReportWizard";

export const metadata: Metadata = { title: "Reportar un bache" };

export default function ReportarPage() {
  return <div data-fullscreen><ReportWizard /></div>;
}
