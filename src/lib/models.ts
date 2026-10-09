export interface ProductBadge {
  title: string;
  severity: string;
  icon: string;
  appIconType?: number;
}

export interface ProductCardData {
  id?: string;
  barcode: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  score: number | null;
  scoreLabel: string;
  quantity: string | null;
  nutriscore?: string | null;
  badges: ProductBadge[];
  badgeCount: number;
  hasDetail?: boolean;
  isSaved?: boolean;
  editedDate?: string | null;
  scanDate?: string | null;
  createdAt?: string | null;
  scanCount?: number;
  source?: string;
}

export interface ApiPagination {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  isLimited: boolean;
  hasMore: boolean;
}

export interface DailyTip {
  code: string;
  name: string;
  description: string;
  risk: string;
  func: string;
  ingredientId: number | null;
  source: string;
}

export interface ProductListInfo {
  id: string;
  name: string;
  icon: string;
  kind: string;
  count: number;
}

export interface ScanStatistics {
  totalScans: number;
  avgScore: number | null;
  additiveTotal: number;
  buckets: number[];
  analyzedProducts: number;
  source: string;
}
