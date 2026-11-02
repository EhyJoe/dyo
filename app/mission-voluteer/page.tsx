import MissionVoluteer from "../../src/components/MissionVoluteer";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page(){return <RequireAuth><MissionVoluteer /></RequireAuth>}
