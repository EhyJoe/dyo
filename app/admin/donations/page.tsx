import Admindonation from "../../../src/components/Admindonation";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="donations"><Admindonation /></RequireSection>}
