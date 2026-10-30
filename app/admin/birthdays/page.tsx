import Adminbirthdays from "../../../src/components/Adminbirthdays";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="birthdays"><Adminbirthdays /></RequireSection>}
