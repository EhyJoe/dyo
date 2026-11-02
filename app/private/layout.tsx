import AdminLayout from "../../src/components/Adminlayout";
import { RequireAdmin } from "../../src/components/Routeguards";
export default function Layout({children}:{children:React.ReactNode}){return <RequireAdmin><AdminLayout>{children}</AdminLayout></RequireAdmin>}


