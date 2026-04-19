import { createContext, useContext, useState, ReactNode } from "react";

type Plan = "free" | "premium";

interface UserContextType {
  name: string;
  plan: Plan;
  togglePlan: () => void;
  upgrade: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [plan, setPlan] = useState<Plan>("free");
  return (
    <UserContext.Provider
      value={{
        name: "Usuário",
        plan,
        togglePlan: () => setPlan(p => p === "free" ? "premium" : "free"),
        upgrade: () => setPlan("premium"),
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
