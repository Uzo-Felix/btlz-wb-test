export interface WBTariffResponse {
  response: {
    data: {
      dtNextPallet: string;
      dtTillMax: string;
      warehouseList: WBWarehouse[];
    };
  };
}

export interface WBWarehouse {
  warehouseName: string;
  palletDeliveryExpr: string;
  palletDeliveryValueBase: string;
  palletDeliveryValueLiter: string;
  palletStorageExpr: string;
  palletStorageValueExpr: string;
}

export interface TariffRecord {
  id?: number;
  date: string;
  warehouse_name: string;
  pallet_delivery_expr: number;
  pallet_delivery_value_base: number;
  pallet_delivery_value_liter: number;
  pallet_storage_expr: number;
  pallet_storage_value_expr: number;
  dt_next_pallet: string;
  dt_till_max: string;
  created_at?: Date;
  updated_at?: Date;
}