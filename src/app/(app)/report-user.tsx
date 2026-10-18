import { router, useLocalSearchParams } from "expo-router";
import { ReportUserScreen } from "@/components/safety/report-user-screen";
import { useSocial } from "@/state/social-fixtures";
export default function ReportRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const social = useSocial();
  const person = social.people.find((p) => p.id === id);
  return (
    <ReportUserScreen
      personName={person?.name}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/people")
      }
      onReport={
        person ? (reason) => social.report(person.id, reason) : undefined
      }
    />
  );
}
