export interface NormalizedAddress {
  viaCode?: string;
  viaLabel?: string;
  primaryNumber?: number;
  secondaryNumber?: number;
  tertiaryNumber?: number;
  quadrant?: string;
  neighborhood?: string;
  municipality?: string;
  department?: string;
  addressStruct?: string;
}

export interface ProximitySearchOptions {
  searchRadius: number; // número de calles a la redonda
  includeNeighborhoods?: boolean;
  includeQuadrants?: boolean;
  exactMatch?: boolean;
  page?: number; // página actual (default: 1)
  limit?: number; // resultados por página (default: 10, max: 100)
}

export interface ProximitySearchRequest {
  address: string;
  options: ProximitySearchOptions;
}

export interface AddressSummary {
  id: string;
  addressRaw: string;
  addressNorm?: string;
  addressCanonical?: string;
  municipality?: string;
  neighborhood?: string;
  transactionValue?: number;
  areaPrivM2?: number;
  areaConstM2?: number;
}

export interface ProximitySearchResult {
  normalizedAddress: NormalizedAddress;
  nearbyAddresses: Array<{
    address: AddressSummary;
    similarity: number;
    distance: number;
  }>;
  searchMetadata: {
    totalFound: number;
    searchRadius: number;
    processingTime: number;
    page: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface AddressMatchCriteria {
  viaCodeMatch?: boolean;
  neighborhoodMatch?: boolean;
  quadrantMatch?: boolean;
  numberRangeMatch?: boolean;
  municipalityMatch?: boolean;
}