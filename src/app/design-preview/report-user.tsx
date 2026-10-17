import { router, useLocalSearchParams } from "expo-router";
import { ReportUserScreen } from "@/components/safety/report-user-screen";
import { useSocialPreview } from "@/dev/social-fixtures";
export default function ReportPreview() {
  const { id = "taylor" } = useLocalSearchParams<{ id?: string }>();
  const social = useSocialPreview();
  const person = social.people.find((p) => p.id === id);
  return (
    <ReportUserScreen
      preview
      personName={person?.name}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/design-preview/people")
      }
      onReport={
        person ? (reason) => social.report(person.id, reason) : undefined
      }
    />
  );
}
