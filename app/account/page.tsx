import { Suspense } from "react";
import Accountpage from "../../src/components/Accountpage";
import { RequireAuth } from "../../src/components/Routeguards";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RequireAuth>
        <Accountpage />
      </RequireAuth>
    </Suspense>
  );
}
