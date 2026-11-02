import Storepage from "../../src/components/Storepage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Storepage /></RequireAuth>}
