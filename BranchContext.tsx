import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';

interface BranchContextType {
  selectedBranchId: number | null;
  setSelectedBranchId: (branchId: number | null) => void;
  isAdmin: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const isAdmin = user?.role === 'admin';

  // For managers, auto-set their branch
  useEffect(() => {
    if (user && user.role === 'manager' && user.branchId) {
      setSelectedBranchId(user.branchId);
    }
  }, [user]);

  return (
    <BranchContext.Provider value={{ selectedBranchId, setSelectedBranchId, isAdmin }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
