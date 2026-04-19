import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface AppShellProps {
  children: ReactNode;
  hideNav?: boolean;
  fullscreen?: boolean;
}

export const AppShell = ({ children, hideNav, fullscreen }: AppShellProps) => {
  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
      <main className={`flex-1 overflow-y-auto no-scrollbar ${fullscreen ? "" : "pb-28"}`}>
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
};
