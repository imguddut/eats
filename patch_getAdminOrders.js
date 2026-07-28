function getAdminOrders() {
  const orderSheet = getSheetByName("Orders");
  const itemsSheet = getSheetByName("OrderItems");
  const custSheet = getSheetByName("Customers");
  
  const orderData = orderSheet ? orderSheet.getDataRange().getValues() : [];
  const itemsData = itemsSheet ? itemsSheet.getDataRange().getValues() : [];
  const custData = custSheet ? custSheet.getDataRange().getValues() : [];
  
  if (orderData.length <= 1) return { success: true, data: [] };
  
  const orderHeaders = orderData.length > 0 ? orderData[0] : [];
  const itemHeaders = itemsData.length > 0 ? itemsData[0] : [];
  const custHeaders = custData.length > 0 ? custData[0] : [];
  
  const orderIdIdx = orderHeaders.indexOf("orderId");
  const custIdIdxInOrders = orderHeaders.indexOf("customerId");
  const orderIdIdxInItems = itemHeaders.indexOf("orderId");
  
  const custIdIdxInCust = custHeaders.indexOf("customerId");
  const custNameIdx = custHeaders.indexOf("name");
  const custPhoneIdx = custHeaders.indexOf("phone");
  const custAddressIdx = custHeaders.indexOf("address");
  
  if (orderIdIdx === -1) {
    return { success: false, message: "orderId header missing in Orders sheet" };
  }
  
  const orders = [];
  for (let i = 1; i < orderData.length; i++) {
    const order = {};
    for (let j = 0; j < orderHeaders.length; j++) {
      order[orderHeaders[j]] = orderData[i][j];
    }
    
    let customerName = "Unknown";
    let customerPhone = "";
    let customerAddress = "";
    
    if (custIdIdxInCust !== -1 && custIdIdxInOrders !== -1 && order.customerId) {
      for (let k = 1; k < custData.length; k++) {
        if (custData[k][custIdIdxInCust] && custData[k][custIdIdxInCust].toString() === order.customerId.toString()) {
          customerName = custNameIdx !== -1 ? custData[k][custNameIdx] : "Customer";
          customerPhone = custPhoneIdx !== -1 ? custData[k][custPhoneIdx] : "";
          customerAddress = custAddressIdx !== -1 ? custData[k][custAddressIdx] : "";
          break;
        }
      }
    }
    
    order.customerName = customerName;
    order.phone = customerPhone;
    order.address = customerAddress;
    
    const items = [];
    if (orderIdIdxInItems !== -1) {
      for (let l = 1; l < itemsData.length; l++) {
        if (itemsData[l][orderIdIdxInItems] && itemsData[l][orderIdIdxInItems].toString() === order.orderId.toString()) {
          const item = {};
          for (let m = 0; m < itemHeaders.length; m++) {
            item[itemHeaders[m]] = itemsData[l][m];
          }
          items.push(item);
        }
      }
    }
    order.items = items;
    orders.push(order);
  }
  orders.reverse();
  return { success: true, data: orders };
}
