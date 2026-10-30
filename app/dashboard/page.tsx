import Memberdashboard from "../../src/components/Memberdashboard";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page() {
  return <RequireAuth><Memberdashboard /></RequireAuth>;
}
