import Adminblog from "../../../src/components/Adminblog";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="blog"><Adminblog /></RequireSection>}
