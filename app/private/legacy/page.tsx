import AdminDashboard from "../../../src/components/AdminDashboard";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="legacy"><AdminDashboard /></RequireSection>}
