import { AppShell } from "@/components/AppShell";
import { BottomNav } from "@/components/BottomNav";
import { HomeScreen } from "@/screens/HomeScreen";
import { ExploreScreen } from "@/screens/ExploreScreen";
import { ShortsScreen } from "@/screens/ShortsScreen";
import { ModelsScreen } from "@/screens/ModelsScreen";
import { ModelProfileScreen } from "@/screens/ModelProfileScreen";
import { VideoScreen } from "@/screens/VideoScreen";
import { VipPromoModal } from "@/components/VipPromoModal";
import { useNav } from "@/contexts/NavContext";

const Index = () => {
  const { tab, setTab, view } = useNav();
  const isShorts = tab === "shorts" && view.type === "tab";
  const isFullScreen = view.type === "video" || view.type === "model";
  const hideNav = view.type === "video";

  return (
    <div className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden bg-background">
      <main
        className={`flex-1 overflow-hidden ${
          isShorts || isFullScreen ? "" : "overflow-y-auto no-scrollbar pb-28"
        }`}
      >
        {view.type === "video" && <VideoScreen id={view.id} />}
        {view.type === "model" && <ModelProfileScreen id={view.id} />}
        {view.type === "tab" && tab === "home" && <HomeScreen />}
        {view.type === "tab" && tab === "explore" && <ExploreScreen />}
        {view.type === "tab" && tab === "shorts" && <ShortsScreen />}
        {view.type === "tab" && tab === "models" && <ModelsScreen />}
      </main>
      {!hideNav && <BottomNav active={tab} onChange={setTab} />}
      <VipPromoModal />
    </div>
  );
};

export default Index;
