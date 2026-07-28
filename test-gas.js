fetch('https://script.google.com/macros/s/AKfycbwHULrIMCQiOBJ8nbnmUVxnlF35iGxJDkb8dulig-3FwJKX-gea6Y2BcAVskkBveFiHrQ/exec', {
  method: 'POST',
  body: JSON.stringify({ action: 'getRestaurants' })
}).then(res => res.text()).then(console.log).catch(console.error);
