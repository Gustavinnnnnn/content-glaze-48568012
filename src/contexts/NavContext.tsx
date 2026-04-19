import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type Tab = "home" | "explore" | "shorts" | "models";

type View =
  | { type: "tab" }
  | { type: "video"; id: string }
  | { type: "model"; id: string };

interface NavContextType {
  tab: Tab;
  setTab: (t: Tab) => void;
  view: View;
  openVideo: (id: string) => void;
  openModel: (id: string) => void;
  back: () => void;
}

const NavContext = createContext<NavContextType | undefined>(undefined);

export const NavProvider = ({ children }: { children: ReactNode }) => {
  const [tab, setTabState] = useState<Tab>("home");
  const [view, setView] = useState<View>({ type: "tab" });

  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    setView({ type: "tab" });
  }, []);

  const openVideo = useCallback((id: string) => setView({ type: "video", id }), []);
  const openModel = useCallback((id: string) => setView({ type: "model", id }), []);
  const back = useCallback(() => setView({ type: "tab" }), []);

  return (
    <NavContext.Provider value={{ tab, setTab, view, openVideo, openModel, back }}>
      {children}
    </NavContext.Provider>
  );
};

export const useNav = () => {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error("useNav must be used within NavProvider");
  return ctx;
};
