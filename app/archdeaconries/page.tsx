import ArchdeaconriesPage from "../../src/components/ArchdeaconriesPage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page() {
  return <RequireAuth><ArchdeaconriesPage /></RequireAuth>;
}
