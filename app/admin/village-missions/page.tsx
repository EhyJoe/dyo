import AdminvillageMissions from "../../../src/components/AdminvillageMissions";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page() {
  return <RequireSection section="programmes"><AdminvillageMissions /></RequireSection>;
}
