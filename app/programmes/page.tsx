import Programmepage from "../../src/components/Programmepage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Programmepage /></RequireAuth>}
