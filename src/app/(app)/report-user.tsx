import { router } from "expo-router";
import { ReportUserScreen } from "@/components/safety/report-user-screen";
export default function ReportRoute() {
  return (
    <ReportUserScreen
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/people")
      }
    />
  );
}
