import Checkoutpage from "../../src/components/Checkoutpage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Checkoutpage /></RequireAuth>}
