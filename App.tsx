import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BranchProvider } from "./contexts/BranchContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Revenues from "./pages/Revenues";
import Expenses from "./pages/Expenses";
import Branches from "./pages/Branches";
import Employees from "./pages/Employees";
import Admin from "./pages/Admin";
import Analytics from "./pages/Analytics";
import Bonuses from "./pages/Bonuses";
import AdminBonuses from "./pages/AdminBonuses";
import SyncMonitor from "./pages/SyncMonitor";
import EmployeeRequestsPage from "./pages/EmployeeRequestsPage";
import ProductOrdersPage from "./pages/ProductOrdersPage";
import RequestAnalyticsPage from "./pages/RequestAnalyticsPage";
import DailyRevenuesPage from "./pages/DailyRevenuesPage";
import BonusHistoryPage from "./pages/BonusHistoryPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/login" component={Login} />
      <Route path="/home" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/revenues" component={Revenues} />
      <Route path="/expenses" component={Expenses} />
      <Route path="/branches" component={Branches} />
      <Route path="/employees" component={Employees} />
      <Route path="/admin" component={Admin} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/bonuses" component={Bonuses} />
      <Route path="/admin/bonuses" component={AdminBonuses} />
      <Route path="/admin/sync" component={SyncMonitor} />
      <Route path="/employee-requests" component={EmployeeRequestsPage} />
      <Route path="/product-orders" component={ProductOrdersPage} />
      <Route path="/analytics/requests" component={RequestAnalyticsPage} />
      <Route path="/daily-revenues" component={DailyRevenuesPage} />
      <Route path="/bonus-history" component={BonusHistoryPage} />

      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <BranchProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </BranchProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;