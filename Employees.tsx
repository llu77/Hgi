import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Phone, User } from "lucide-react";
import { Redirect } from "wouter";

export default function Employees() {
  const { user, loading } = useAuth();
  
  // Managers see only their branch employees, admins see all
  const branchId = user?.role === "manager" ? user.branchId : undefined;
  const { data: employees, isLoading } = trpc.employees.list.useQuery(
    branchId ? { branchId } : undefined
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">جاري التحميل...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  if (user.role !== "admin" && user.role !== "manager") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-navy-900">الموظفون</h1>
            <p className="text-gray-600 mt-2">
              {user.role === "manager" 
                ? "عرض موظفي فرعك" 
                : "عرض وإدارة جميع الموظفين"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>قائمة الموظفين</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="text-lg">جاري تحميل الموظفين...</div>
              </div>
            ) : employees && employees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">الكود</TableHead>
                      <TableHead className="text-right">الاسم</TableHead>
                      <TableHead className="text-right">المنصب</TableHead>
                      <TableHead className="text-right">الهاتف</TableHead>
                      <TableHead className="text-right">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.code}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            {employee.name}
                          </div>
                        </TableCell>
                        <TableCell>{employee.position || "-"}</TableCell>
                        <TableCell>
                          {employee.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-gray-400" />
                              {employee.phone}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            employee.isActive 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }`}>
                            {employee.isActive ? "نشط" : "غير نشط"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا يوجد موظفون</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
