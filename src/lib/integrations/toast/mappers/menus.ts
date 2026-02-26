/**
 * Toast Menu Mapper
 *
 * Maps Toast menus to MenuItem and MenuCategory records.
 */

import type { Prisma } from "@/generated/prisma";
import type { ToastMenu, ToastMenuGroup, ToastMenuItem } from "../types";

/**
 * Extract unique categories from Toast menus
 */
export function extractCategories(
  menus: ToastMenu[],
  locationId: string
): Map<string, Prisma.MenuCategoryCreateInput> {
  const categories = new Map<string, Prisma.MenuCategoryCreateInput>();

  for (const menu of menus) {
    for (const group of menu.groups) {
      // Use group name as category, avoid duplicates
      if (!categories.has(group.name)) {
        categories.set(group.name, {
          location: { connect: { id: locationId } },
          name: group.name,
          displayOrder: categories.size,
          externalId: group.guid,
        });
      }
    }
  }

  return categories;
}

/**
 * Map Toast menu items to Prisma inputs
 */
export function mapMenuItemsToPrisma(
  menus: ToastMenu[],
  locationId: string,
  categoryIdMap: Map<string, string> // category name -> Prisma ID
): Prisma.MenuItemCreateManyInput[] {
  const items: Prisma.MenuItemCreateManyInput[] = [];
  const seenItems = new Set<string>();

  for (const menu of menus) {
    for (const group of menu.groups) {
      const categoryId = categoryIdMap.get(group.name);
      if (!categoryId) continue;

      for (const item of group.items) {
        // Skip duplicates (same item might appear in multiple menus)
        if (seenItems.has(item.guid)) continue;
        seenItems.add(item.guid);

        items.push({
          locationId,
          categoryId,
          name: item.name,
          description: item.description,
          currentPrice: item.price,
          externalId: item.guid,
          isActive: item.visibility !== "NONE",
        });
      }
    }
  }

  return items;
}

/**
 * Map categories to Prisma create inputs (for batch creation)
 */
export function mapCategoriesToPrismaCreateMany(
  menus: ToastMenu[],
  locationId: string
): Prisma.MenuCategoryCreateManyInput[] {
  const categories = new Map<string, Prisma.MenuCategoryCreateManyInput>();
  let order = 0;

  for (const menu of menus) {
    for (const group of menu.groups) {
      if (!categories.has(group.name)) {
        categories.set(group.name, {
          locationId,
          name: group.name,
          displayOrder: order++,
          externalId: group.guid,
        });
      }
    }
  }

  return Array.from(categories.values());
}

/**
 * Find new and updated menu items comparing Toast data to existing
 */
export function diffMenuItems(
  toastItems: ToastMenuItem[],
  existingItems: Array<{ externalId: string | null; currentPrice: number; isActive: boolean }>
): {
  toCreate: ToastMenuItem[];
  toUpdate: Array<{ externalId: string; price: number; isActive: boolean }>;
} {
  const existingMap = new Map(
    existingItems
      .filter((i) => i.externalId)
      .map((i) => [i.externalId!, { price: i.currentPrice, isActive: i.isActive }])
  );

  const toCreate: ToastMenuItem[] = [];
  const toUpdate: Array<{ externalId: string; price: number; isActive: boolean }> = [];

  for (const item of toastItems) {
    const existing = existingMap.get(item.guid);

    if (!existing) {
      toCreate.push(item);
    } else {
      const isActive = item.visibility !== "NONE";
      // Check if price or active status changed
      if (existing.price !== item.price || existing.isActive !== isActive) {
        toUpdate.push({
          externalId: item.guid,
          price: item.price,
          isActive,
        });
      }
    }
  }

  return { toCreate, toUpdate };
}

/**
 * Flatten all items from Toast menus
 */
export function flattenMenuItems(
  menus: ToastMenu[]
): Array<ToastMenuItem & { categoryName: string }> {
  const items: Array<ToastMenuItem & { categoryName: string }> = [];

  for (const menu of menus) {
    for (const group of menu.groups) {
      for (const item of group.items) {
        items.push({
          ...item,
          categoryName: group.name,
        });
      }
    }
  }

  return items;
}
