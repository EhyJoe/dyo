import Adminproducts from "../../../src/components/Adminproducts";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="store"><Adminproducts /></RequireSection>}
