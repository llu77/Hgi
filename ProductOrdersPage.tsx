import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBranch } from "@/contexts/BranchContext";
import { ShoppingCart, Plus, Trash2, CheckCircle, XCircle, Clock, Package } from "lucide-react";
import { format } from "date-fns";
import Decimal from "decimal.js";

const STATUS_LABELS = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-yellow-600" },
  approved: { label: "موافق عليه", icon: CheckCircle, color: "text-green-600" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-red-600" },
  delivered: { label: "تم التسليم", icon: Package, color: "text-blue-600" },
};

interface Product {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export default function ProductOrdersPage() {
  const { user } = useAuth();
  const { selectedBranchId, setSelectedBranchId } = useBranch();

  const [showForm, setShowForm] = useState(false);
  const [localBranchId, setLocalBranchId] = useState<number | null>(null);
  const [showBranchError, setShowBranchError] = useState(false);
  const [employeeName, setEmployeeName] = useState("");
  const [products, setProducts] = useState<Product[]>([
    { name: "", quantity: 1, price: 0, total: 0 },
  ]);

  // Get effective branch ID
  // Admin: uses manually selected branch (localBranchId or selectedBranchId)
  // Manager/Employee: automatically uses their assigned branch (user.branchId)
  const effectiveBranchId = user?.role === "admin" 
    ? (localBranchId || selectedBranchId)
    : user?.branchId;

  // Queries
  const { data: branchesData } = trpc.branches.list.useQuery();
  const { data: ordersData, refetch } = trpc.productOrders.list.useQuery({
    branchId: effectiveBranchId || undefined,
  });

  // Mutations
  const createOrder = trpc.productOrders.create.useMutation({
    onSuccess: () => {
      toast.success("تم إنشاء طلب المنتجات بنجاح");
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const updateStatus = trpc.productOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("تم تحديث حالة الطلب");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "حدث خطأ");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setEmployeeName("");
    setProducts([{ name: "", quantity: 1, price: 0, total: 0 }]);
  };

  const addProduct = () => {
    setProducts([...products, { name: "", quantity: 1, price: 0, total: 0 }]);
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof Product, value: string | number) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-calculate total for this product
    if (field === "quantity" || field === "price") {
      const qty = new Decimal(updated[index].quantity || 0);
      const price = new Decimal(updated[index].price || 0);
      updated[index].total = qty.mul(price).toNumber();
    }

    setProducts(updated);
  };

  const calculateGrandTotal = (): number => {
    return products.reduce((sum, p) => {
      return new Decimal(sum).add(p.total).toNumber();
    }, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate branch selection for admin users
    if (user?.role === "admin" && !effectiveBranchId) {
      toast.error("يجب اختيار الفرع أولاً");
      setShowBranchError(true);
      return;
    }

    if (!effectiveBranchId) {
      toast.error("يرجى اختيار الفرع");
      return;
    }

    setShowBranchError(false);

    const branch = branchesData?.find((b) => b.id === effectiveBranchId);
    if (!branch) {
      toast.error("الفرع غير موجود");
      return;
    }

    // Validate products
    const hasEmptyProduct = products.some((p) => !p.name.trim() || p.quantity <= 0 || p.price <= 0);
    if (hasEmptyProduct) {
      toast.error("يرجى ملء جميع بيانات المنتجات بشكل صحيح");
      return;
    }

    const grandTotal = calculateGrandTotal();
    if (grandTotal <= 0) {
      toast.error("الإجمالي الكلي يجب أن يكون أكبر من صفر");
      return;
    }

    createOrder.mutate({
      branchId: effectiveBranchId,
      branchName: branch.name,
      employeeName,
      products,
      grandTotal,
    });
  };

  const handleStatusChange = (
    id: number,
    status: "approved" | "rejected" | "delivered",
    adminResponse?: string
  ) => {
    updateStatus.mutate({ id, status, adminResponse });
  };

  return (
    <div className="container py-8 space-y-6" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-navy">طلبات المنتجات</h1>
            <p className="text-navy/60 mt-2">إدارة طلبات المنتجات للموظفين</p>
          </div>
          {user?.role !== "employee" && (
            <Button onClick={() => setShowForm(!showForm)} className="bg-gold hover:bg-gold/90 gap-2">
              <Plus className="w-4 h-4" />
              {showForm ? "إلغاء" : "+ طلب جديد"}
            </Button>
          )}
        </div>

        {/* Branch Selector for Admin */}
        {user?.role === "admin" && (
          <Card className={`p-4 ${showBranchError ? 'bg-red-50 border-2 border-red-500' : 'bg-cream/30'}`}>
            <div className="flex items-center gap-4">
              <Label className="text-navy font-semibold min-w-[100px]">اختر الفرع: {showBranchError && <span className="text-red-600">*</span>}</Label>
              <Select
                value={localBranchId?.toString() || ""}
                onValueChange={(value) => {
                  setLocalBranchId(value ? parseInt(value) : null);
                  setShowBranchError(false);
                }}
              >
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="اختر الفرع لعرض الطلبات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">جميع الفروع</SelectItem>
                  {branchesData?.map((branch: any) => (
                    <SelectItem key={branch.id} value={branch.id.toString()}>
                      {branch.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localBranchId && (
                <span className="text-sm text-navy/60">
                  الفرع المحدد: {branchesData?.find((b: any) => b.id === localBranchId)?.nameAr || "جميع الفروع"}
                </span>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">إنشاء طلب منتجات جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Employee Name */}
            <div>
              <Label>اسم الموظف *</Label>
              <Input
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="أدخل اسم الموظف"
                required
              />
            </div>

            {/* Products */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg">المنتجات</Label>
                <Button type="button" size="sm" onClick={addProduct} className="gap-2">
                  <Plus className="w-4 h-4" />
                  إضافة منتج
                </Button>
              </div>

              {products.map((product, index) => (
                <Card key={index} className="p-4 bg-cream/30">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div className="md:col-span-2">
                      <Label>اسم المنتج *</Label>
                      <Input
                        value={product.name}
                        onChange={(e) => updateProduct(index, "name", e.target.value)}
                        placeholder="اسم المنتج"
                        required
                      />
                    </div>

                    <div>
                      <Label>الكمية *</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div>
                      <Label>السعر (ريال) *</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={product.price}
                        onChange={(e) => updateProduct(index, "price", parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <Label>الإجمالي</Label>
                        <Input
                          value={product.total.toFixed(2)}
                          readOnly
                          disabled
                          className="bg-cream/50 font-semibold"
                        />
                      </div>
                      {products.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="destructive"
                          onClick={() => removeProduct(index)}
                          className="mt-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Grand Total */}
            <Card className="p-4 bg-golden/10 border-golden">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">الإجمالي الكلي:</span>
                <span className="text-2xl font-bold text-golden">{calculateGrandTotal().toFixed(2)} ريال</span>
              </div>
            </Card>

            <div className="flex gap-2">
              <Button type="submit" disabled={createOrder.isPending}>
                {createOrder.isPending ? "جاري الإرسال..." : "إرسال الطلب"}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm}>
                إلغاء
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Orders List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" />
          قائمة الطلبات
        </h2>

        {!ordersData?.orders.length ? (
          <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
        ) : (
          <div className="space-y-4">
            {ordersData.orders.map((order) => {
              const StatusIcon = STATUS_LABELS[order.status].icon;

              return (
                <Card key={order.id} className="p-4 border-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <ShoppingCart className="w-5 h-5 text-golden" />
                        <h3 className="font-semibold text-lg">طلب منتجات #{order.id}</h3>
                        <span className={`flex items-center gap-1 text-sm ${STATUS_LABELS[order.status].color}`}>
                          <StatusIcon className="w-4 h-4" />
                          {STATUS_LABELS[order.status].label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <p>
                          <strong>الموظف:</strong> {order.employeeName}
                        </p>
                        <p>
                          <strong>الفرع:</strong> {order.branchName}
                        </p>
                        <p>
                          <strong>التاريخ:</strong> {format(new Date(order.createdAt), "dd/MM/yyyy")}
                        </p>
                        <p>
                          <strong>الإجمالي:</strong>{" "}
                          <span className="text-golden font-semibold">{order.grandTotal.toFixed(2)} ريال</span>
                        </p>
                      </div>

                      {/* Products Table */}
                      <div className="bg-cream/20 rounded-lg p-3 mb-2">
                        <h4 className="font-semibold text-sm mb-2">المنتجات:</h4>
                        <div className="space-y-1">
                          {order.products.map((product: Product, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>
                                {idx + 1}. {product.name}
                              </span>
                              <span className="text-muted-foreground">
                                {product.quantity} × {product.price.toFixed(2)} ={" "}
                                <strong>{product.total.toFixed(2)} ريال</strong>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {order.adminResponse && (
                        <p className="text-sm text-blue-600 mt-2">
                          <strong>رد الإدارة:</strong> {order.adminResponse}
                        </p>
                      )}
                    </div>

                    {/* Admin Actions */}
                    {user?.role === "admin" && (
                      <div className="flex flex-col gap-2">
                        {order.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleStatusChange(order.id, "approved", "تمت الموافقة")}
                              disabled={updateStatus.isPending}
                            >
                              موافقة
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleStatusChange(order.id, "rejected", "تم الرفض")}
                              disabled={updateStatus.isPending}
                            >
                              رفض
                            </Button>
                          </>
                        )}
                        {order.status === "approved" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusChange(order.id, "delivered", "تم التسليم")}
                            disabled={updateStatus.isPending}
                          >
                            تم التسليم
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
