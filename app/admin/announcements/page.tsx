import Adminannouncements from "../../../src/components/Adminannouncements";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="announcements"><Adminannouncements /></RequireSection>}
