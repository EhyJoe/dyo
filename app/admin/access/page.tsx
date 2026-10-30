import Adminaccess from "../../../src/components/Adminaccess";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="access"><Adminaccess /></RequireSection>}
