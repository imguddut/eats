export async function getAdminDashboard(): Promise<{
  todayOrders: number;
  pendingOrders: number;
  preparingOrders: number;
  outForDelivery: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalCustomers: number;
  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  totalSales: number;
  averageOrderValue: number;
  todayProfit?: number;
  weeklyProfit?: number;
  monthlyProfit?: number;
  totalProfit?: number;
  recentOrders: Array<any>;
}> {
  const gasUrl = getGasUrl();
  const defaultDashboard = {
    todayOrders: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    outForDelivery: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    totalCustomers: 0,
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    totalSales: 0,
    averageOrderValue: 0,
    todayProfit: 0,
    weeklyProfit: 0,
    monthlyProfit: 0,
    totalProfit: 0,
    recentOrders: [],
  };

  if (!gasUrl) {
    console.warn('Google Sheets not configured. Dashboard unavailable.');
    return defaultDashboard;
  }
  
  try {
    const res = await fetchFromGas('getAdminDashboard', {});
    if (res && res.success) {
      return res.data;
    }
  } catch (err) {
    console.error('Failed to get admin dashboard from GAS', err);
  }
  
  return defaultDashboard;
}
