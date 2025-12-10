import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Building2, Users } from "lucide-react";
import { Redirect } from "wouter";

export default function Branches() {
  const { user, loading } = useAuth();
  const { data: branches, isLoading } = trpc.branches.list.useQuery();

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

  if (user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-navy-900">إدارة الفروع</h1>
          <p className="text-gray-600 mt-2">عرض وإدارة فروع الشركة</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-lg">جاري تحميل الفروع...</div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {branches?.map((branch) => (
              <Card key={branch.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gold-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-gold-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{branch.name}</CardTitle>
                      <CardDescription>الكود: {branch.code}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">العنوان:</span>
                      <span className="font-medium">{branch.address || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">الهاتف:</span>
                      <span className="font-medium">{branch.phone || "غير محدد"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">الحالة:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        branch.isActive 
                          ? "bg-green-100 text-green-700" 
                          : "bg-red-100 text-red-700"
                      }`}>
                        {branch.isActive ? "نشط" : "غير نشط"}
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => window.location.href = `/employees?branch=${branch.id}`}
                    >
                      <Users className="h-4 w-4 ml-2" />
                      عرض الموظفين
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && branches?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد فروع مسجلة</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
