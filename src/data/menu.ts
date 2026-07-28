import { MenuItem, Category, Restaurant } from '../types';

export const categories: Category[] = [
  {
    category: 'Biriyani',
    displayName: 'Biriyani',
    image: 'https://media-assets.swiggy.com/swiggy/image/upload/fl_lossy,f_auto,q_auto,w_366/RX_THUMBNAIL/IMAGES/VENDOR/2025/7/17/31f98a8b-b727-47fa-b84d-fc385bd91c1c_27768.jpg'
  },
  {
    category: 'Thali',
    displayName: 'Thali',
    image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Mushroom',
    displayName: 'Mushroom',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQMjZgPQMfHXbjXjBO1Dg-Bi91KoEVKr0VdSd551HOl8Q1M1RzN-V36XYaT&s=10'
  },
  {
    category: 'Paneer',
    displayName: 'Paneer',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Veg Main Course',
    displayName: 'Veg Main Course',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQidzHB9codOjmtE6Y6sRdlEWr8cwZJMnhhP-k14KAh_zpDM1eMmt4yKfue&s=10'
  },
  {
    category: 'Rolls',
    displayName: 'Rolls',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTxJ8tyen0ohNFIs5sOjrLGVUKu4c-4_hKu-YTCT9T82GLmeUijB4-kwN0&s=10'
  },
  {
    category: 'Soup',
    displayName: 'Soup',
    image: 'https://www.allrecipes.com/thmb/0yQRCKabMf_wuVZRtbmINYC8C1g=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/246221-easy-spinach-soup-PICS-Beauty-4x3-ffab563eef7846f5a80f467d8cd01914.jpg'
  },
  {
    category: 'Chinese',
    displayName: 'Chinese',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTGFGggz9O_5IIzDbT-0k81P_S8icsg1dX783mTEbIYhjHU7jTL5dYPrv8&s=10'
  },
  {
    category: 'Starter',
    displayName: 'Starter',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSxuht4M1THfwdhGvEtsMFci7k679BH13OVclYHDBU6WpHBRE73xfcitYyM&s=10'
  },
  {
    category: 'Snacks',
    displayName: 'Snacks',
    image: 'https://static.toiimg.com/photo/59217136.cms'
  },
  {
    category: 'Lunch',
    displayName: 'Lunch',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT8V6WmvRBKt-9BsC6dVNddbPwwDSbZ9zFdNEbrwU6kBvBvoqPsIO2FeI2B&s=10'
  },
  {
    category: 'South Indian',
    displayName: 'South Indian',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRca8sUgmRysFvvJUQWUhzrBROcUvV_vf8A6IIn13wjJxvTfzhe5MU49qk&s=10'
  },
  {
    category: 'Roti & Naan',
    displayName: 'Roti & Naan',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSiMCHaY34CYGnvEuT14ANmvr9N_DqhLcMP4xRRl17Qi76W2s_mWj_DXo8F&s=10'
  },
  {
    category: 'Rice',
    displayName: 'Rice',
    image: 'https://www.indianhealthyrecipes.com/wp-content/uploads/2023/07/basmati-rice-recipe.jpg'
  },
  {
    category: 'Corn',
    displayName: 'Corn',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSdtnlkGElSoOEP_PkDrZ7XC8Za39x1kIBu1srdMfUaON2x-iWXgCTejD3i&s=10'
  },
  {
    category: 'Chicken',
    displayName: 'Chicken',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQueVJnAW3TIK8pgUEqa5PgFEcN36wJLAnl3urJgXdaAUhdO5pAaYpchto&s=10'
  },
  {
    category: 'Mutton',
    displayName: 'Mutton',
    image: 'https://curlytales.com/wp-content/uploads/2024/08/2-118.jpg'
  },
  {
    category: 'Egg',
    displayName: 'Egg',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ2WGsSqO4SEU1aGiPBUeG4dP0b2iWu07NlXakXkxb0DNH0P6C9jq99avw&s=10'
  },
  {
    category: 'Tandoor',
    displayName: 'Tandoor',
    image: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Chickentandoori.jpg'
  },
  {
    category: 'Mocktail',
    displayName: 'Mocktail',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTETuKUTCQ1dnITptZuD9h9ORRPH0rn8A1ZErw8OCrPsjGaL78TO_CcLHtm&s=10'
  },
  {
    category: 'Dal',
    displayName: 'Dal',
    image: 'https://www.honeywhatscooking.com/wp-content/uploads/2024/06/Toor-Dal-Tadka-Instant_pot.jpg'
  },
  {
    category: 'Manchurian',
    displayName: 'Manchurian',
    image: 'https://i.ytimg.com/vi/83NdVrRwrP0/hq720.jpg?sqp=-oaymwEhCK4FEIIDSFryq4qpAxMIARUAAAAAGAElAADIQj0AgKJD&rs=AOn4CLClmTc_lkuqceYpY6IlroeO8cly3g'
  },
  {
    category: 'Pizza',
    displayName: 'Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Burger',
    displayName: 'Burger',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Beverages',
    displayName: 'Beverages',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTx9oPOAKQrWOVnutzvtiy_kBnZ-sNQSPG6BgYbwNK3eQ&s'
  },
  {
    category: 'Desserts',
    displayName: 'Desserts',
    image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRlHKqkfGiR-owa1tokP9P3fEaUzTgFYuWUnfK4tQSwcNyyFlM6ziSikAdL&s=10'
  },
  {
    category: 'Cake',
    displayName: 'Cake',
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Cold Drinks',
    displayName: 'Cold Drinks',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Fish',
    displayName: 'Fish',
    image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Salad',
    displayName: 'Salad',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Raita',
    displayName: 'Raita',
    image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Breakfast',
    displayName: 'Breakfast',
    image: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Fried Momos',
    displayName: 'Fried Momos',
    image: 'https://images.unsplash.com/photo-1625220194771-7ebdea0b70b9?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Paneer Bhujia',
    displayName: 'Paneer Bhujia',
    image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Chilli',
    displayName: 'Chilli',
    image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Noodles',
    displayName: 'Noodles',
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Non-Veg Main Course',
    displayName: 'Non-Veg Main Course',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Non-Veg Appetizer',
    displayName: 'Non-Veg Appetizer',
    image: 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=500&auto=format&fit=crop&q=60'
  },
  {
    category: 'Veg Appetizer',
    displayName: 'Veg Appetizer',
    image: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500&auto=format&fit=crop&q=60'
  }
];

export const initialRestaurants: Restaurant[] = [
  {
    id: 'rest1',
    name: 'ArwalEats Main Kitchen',
    phone: '+91 81021 23746',
    address: 'Bariatu Road, Opposite Rajendra Medical College, Arwal, Bihar 804401',
    cuisine: 'Multi-Cuisine, North Indian, Chinese',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop&q=60',
    rating: 4.8,
    deliveryTime: '25-35 mins',
    active: true,
    featured: true,
    deliveryRadius: 15,
    latitude: 25.0143,
    longitude: 84.6784,
    isClosed: false,
    openingTime: '11:00 AM',
    closingTime: '11:00 PM',
    closedMessage: 'Main Kitchen is currently closed.'
  }
];

export const initialMenu: MenuItem[] = [];
