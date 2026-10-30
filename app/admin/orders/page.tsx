import Adminorders from "../../../src/components/Adminorders";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="orders"><Adminorders /></RequireSection>}
