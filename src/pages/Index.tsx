import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { HomeScreen } from "@/screens/HomeScreen";
import { ExploreScreen } from "@/screens/ExploreScreen";
import { ShortsScreen } from "@/screens/ShortsScreen";
import { UserProvider } from "@/contexts/UserContext";

type Tab = "home" | "explore" | "shorts";

const Inner = () => {
  const [tab, setTab] = useState<Tab>("home");
  const isShorts = tab === "shorts";

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
      <main className={`flex-1 overflow-hidden ${isShorts ? "" : "overflow-y-auto no-scrollbar pb-28"}`}>
        {tab === "home" && <HomeScreen />}
        {tab === "explore" && <ExploreScreen />}
        {tab === "shorts" && <ShortsScreen />}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
};

const Index = () => (
  <UserProvider>
    <Inner />
  </UserProvider>
);

export default Index;
