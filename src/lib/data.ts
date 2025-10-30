import db from './db.json';
import { PlaceHolderImages } from './placeholder-images';
import type { SpecialOffer, MenuItem, PastOrder, Order, KitchenOrder, User, AdminUser, TableStatus } from './types';

const findImage = (id: string) => {
  const img = PlaceHolderImages.find((p) => p.id === id);
  if (!img) {
    return { url: 'https://placehold.co/600x400', hint: 'placeholder' };
  }
  return { url: img.imageUrl, hint: img.imageHint };
};


export const specialOffers: SpecialOffer[] = db.specialOffers.map(offer => ({
  ...offer,
  image: findImage(offer.imageId)
}));

export const mockMenu: MenuItem[] = db.menuItems.map(item => ({
    ...item,
    image: findImage(item.imageId)
}));

export const mockPastOrders: PastOrder[] = db.pastOrders.map(order => ({
    ...order,
    items: order.items.map(item => {
        const menuItem = mockMenu.find(mi => mi.id === item.id);
        return {
            ...item,
            price: menuItem ? menuItem.price : 0,
        };
    })
}));

export const mockOrders: Order[] = db.orders;

export const mockKitchenOrders: { new: KitchenOrder[], 'in-progress': KitchenOrder[], completed: KitchenOrder[] } = {
  new: db.kitchenOrders.new,
  'in-progress': db.kitchenOrders.inProgress,
  completed: db.kitchenOrders.completed
};

export const mockSalesData = db.salesData;

export const mockUsers: User[] = db.users;

export const mockAdminUsers: AdminUser[] = db.adminUsers;

export const mockTableStatuses: TableStatus[] = db.tableStatuses;
