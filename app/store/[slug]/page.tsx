import Productdetail from "../../../src/components/Productdetail";
import { RequireAuth } from "../../../src/components/Routeguards";

export default function Page(){return <RequireAuth><Productdetail /></RequireAuth>}
