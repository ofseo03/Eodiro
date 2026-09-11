import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata: Metadata = { title: "취향 설정" };

export default function SettingsPage() {
  return <SettingsView />;
}
