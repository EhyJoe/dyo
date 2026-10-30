import Adminaudit from "../../../src/components/Adminaudit";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="audit"><Adminaudit /></RequireSection>}
