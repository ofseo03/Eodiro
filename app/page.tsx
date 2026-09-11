import { Landing } from "@/components/landing/Landing";
import { CourseRequestForm } from "@/components/home/CourseRequestForm";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";

/** 홈 `/` — 랜딩 영역 + 코스 요청 폼 (spec 5.2 · 5.8). */
export default function HomePage() {
  return (
    <>
      <Landing />
      <section className="container section-compact" id="request" aria-labelledby="request-title">
        <span className="sr-only" id="request-title">코스 추천받기</span>
        <CourseRequestForm />
      </section>
      <OnboardingModal />
    </>
  );
}
