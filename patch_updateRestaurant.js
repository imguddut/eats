function updateRestaurant(restaurant) {
  const sheet = getSheetByName("Restaurants");
  let data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: "No restaurants" };
  
  let headers = data[0];
  let updatedHeaders = false;
  
  const restKeys = Object.keys(restaurant);
  for (let i = 0; i < restKeys.length; i++) {
    const key = restKeys[i];
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      sheet.getRange(1, headers.length).setValue(key);
      updatedHeaders = true;
    }
  }
  
  if (updatedHeaders) {
    data = sheet.getDataRange().getValues();
    headers = data[0];
  }
  
  const idIdx = headers.indexOf("id");
  if (idIdx === -1) return { success: false, message: "id header missing in Restaurants" };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][idIdx] && data[i][idIdx].toString() === restaurant.id.toString()) {
      for (let j = 0; j < headers.length; j++) {
        const key = headers[j];
        if (key !== "id" && restaurant[key] !== undefined) {
          let val = restaurant[key];
          if (key === "latitude" || key === "longitude" || key === "rating" || key === "deliveryRadius") {
            val = parseFloat(val) || 0;
          }
          sheet.getRange(i + 1, j + 1).setValue(val);
        }
      }
      return { success: true };
    }
  }
  return { success: false, message: "Restaurant not found" };
}
