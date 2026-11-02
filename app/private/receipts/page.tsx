import Adminreceipts from "../../../src/components/Adminreceipts";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="receipts"><Adminreceipts /></RequireSection>}
