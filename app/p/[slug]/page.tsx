import Sitepage from "../../../src/components/Sitepage";
import { RequireAuth } from "../../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Sitepage /></RequireAuth>}
