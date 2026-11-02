import Adminmembers from "../../../src/components/Adminmembers";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="members"><Adminmembers /></RequireSection>}
