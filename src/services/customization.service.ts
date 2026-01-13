import { ApiClient } from "./api.service";
import { CustomizationGroup, CreateCustomizationGroupDTO, UpdateCustomizationGroupDTO } from "@/lib/types";

export const CustomizationService = {
  getAll: async (restaurantId: number): Promise<CustomizationGroup[]> => {
    // The backend endpoint /api/v1/customizations uses req.user.restaurantId
    // so we might not need to pass it if the token has it.
    // However, if we need to filter or if the backend supports query param:
    const { data } = await ApiClient.get(`/customizations`);
    // Map backend response (snake_case) to frontend (camelCase or matching interface)
    // My interface uses snake_case for DB fields? 
    // Wait, the interface I added has `min_selection`. A lot of existing code uses camelCase.
    // The backend returns what the DB returns unless I transformed it.
    // My backend `CustomizationModel` returns DB rows (snake_case).
    // My interface `CustomizationGroup` uses snake_case. Good.
    // Except `id` vs `group_id`.
    // The backend `createGroup` returns `group_id`.
    // My interface says `id`. I should map it.
    
    return data.map((item: any) => ({
        ...item,
        id: item.group_id,
        options: item.options?.map((opt: any) => ({
            ...opt,
            id: opt.option_id
        })) || []
    }));
  },

  create: async (payload: CreateCustomizationGroupDTO): Promise<CustomizationGroup> => {
    const { data } = await ApiClient.post("/customizations", payload);
    console.log("Create group response:", data);
    const created = data; // ApiResponse.created puts result in data. The destructured data IS that result? 
    // Wait. ApiClient returns { success, message, data }. 
    // const { data } = await ApiClient... extracts the inner data.
    // So 'data' here is the group object.
    
    return {
        ...created,
        id: created.group_id,
        options: created.options?.map((opt: any) => ({ ...opt, id: opt.option_id })) || []
    };
  },



  update: async (id: number, payload: UpdateCustomizationGroupDTO): Promise<CustomizationGroup> => {
    const { data } = await ApiClient.put(`/customizations/${id}`, payload);
    const updated = data;
    return {
        ...updated,
        id: updated.group_id,
        options: updated.options?.map((opt: any) => ({ ...opt, id: opt.option_id })) || []
    };
  },

  delete: async (id: number): Promise<void> => {
    await ApiClient.delete(`/customizations/${id}`);
  },

  // Item Assignment
  getForItem: async (itemId: number): Promise<any[]> => {
      const { data } = await ApiClient.get(`/customizations/item/${itemId}`);
      return data;
  },

  assignToItem: async (payload: { itemId: number, groupId: number, optionsOverrides: any[] }): Promise<void> => {
      // payload matches backend expectation: { itemId, groupId, options: [{ optionId, priceModifier, isDefault }] }
      // Wait, backend controller expects `options` in body, forcing `optionsOverrides` to `options`
      await ApiClient.post(`/customizations/assign`, {
          itemId: payload.itemId,
          groupId: payload.groupId,
          options: payload.optionsOverrides
      });
  },

  removeForItem: async (itemId: number, groupId: number): Promise<void> => {
      await ApiClient.delete(`/customizations/item/${itemId}/group/${groupId}`);
  }
};
