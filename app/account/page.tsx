import Accountpage from "../../src/components/Accountpage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Accountpage /></RequireAuth>}
