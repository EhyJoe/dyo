import VoucherGenerator from "../../../src/components/VoucherGenerator";
import { RequireSection } from "../../../src/components/Routeguards";

export default function Page(){return <RequireSection section="vouchers"><VoucherGenerator /></RequireSection>}
