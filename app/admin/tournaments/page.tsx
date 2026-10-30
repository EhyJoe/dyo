import Admintournaments from "../../../src/components/Admintournaments";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="tournaments"><Admintournaments /></RequireSection>}
