import { createContext, useContext, useState, ReactNode, useCallback } from "react";

type Plan = "free" | "premium";

interface UserContextType {
  name: string;
  plan: Plan;
  togglePlan: () => void;
  upgrade: () => void;
  subscribedModels: string[];
  subscribeToModel: (id: string) => void;
  isSubscribedTo: (id: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [plan, setPlan] = useState<Plan>("free");
  const [subscribedModels, setSubscribed] = useState<string[]>([]);

  const subscribeToModel = useCallback((id: string) => {
    setSubscribed((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const isSubscribedTo = useCallback(
    (id: string) => subscribedModels.includes(id),
    [subscribedModels]
  );

  return (
    <UserContext.Provider
      value={{
        name: "Usuário",
        plan,
        togglePlan: () => setPlan((p) => (p === "free" ? "premium" : "free")),
        upgrade: () => setPlan("premium"),
        subscribedModels,
        subscribeToModel,
        isSubscribedTo,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};
