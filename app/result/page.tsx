import type { Metadata } from "next";
import { ResultView } from "@/components/result/ResultView";

export const metadata: Metadata = { title: "추천 코스" };

export default function ResultPage() {
  return <ResultView />;
}
