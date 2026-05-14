import MaxWidthWrapper from "@/components/ui/MaxWidthWrapper";
import { ReactNode } from "react";
import Steps from "@/components/ui/Steps";

const Layout = ({ children }: { children: ReactNode }) => {
  return (
    <MaxWidthWrapper className="flex-1 flex flex-col">
      <Steps />
      {children}
    </MaxWidthWrapper>
  );
};

export default Layout;
