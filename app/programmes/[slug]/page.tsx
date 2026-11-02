import Programmedetail from "../../../src/components/Programmedetail";
import { RequireAuth } from "../../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Programmedetail /></RequireAuth>}
