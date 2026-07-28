export type StockPhotoResult = {
  id: string,
  thumbUrl: string,
  fullUrl: string,
  downloadUrl: string,
  description?: string,
  photographerName: string,
  photographerUrl?: string,
  providerName: string,
  providerUrl?: string,
  width?: number,
  height?: number,
};

export type StockPhotoSearchOptions = {
  apiKey: string,
  page?: number,
  perPage?: number,
};

export type StockPhotoSearchResponse = {
  results: StockPhotoResult[],
  totalPages?: number,
};

export interface StockPhotoProvider {
  name: string;
  search(query: string, options: StockPhotoSearchOptions): Promise<StockPhotoSearchResponse>;
}
