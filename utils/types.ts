export type Status = {
  text: string;
  type: 'info' | 'error' | 'success';
  progress?: number;
};

export type View = 'import' | 'report' | 'dashboard' | 'simulations' | 'data-preview';

export type DataType = 'products' | 'goodsReceipts' | 'openOrders' | 'sales';

export type ManualDelivery = {
    date: string;
    quantity: number;
    id: number;
};
