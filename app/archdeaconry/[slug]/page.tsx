import Archdeaconrypage from "../../../src/components/Archdeaconrypage";
import { RequireAuth } from "../../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Archdeaconrypage /></RequireAuth>}
