import { Inject, Injectable } from '@nestjs/common';
import { and, eq, gte, lte, or, like, sql } from 'drizzle-orm';
import type { Database } from '../../db';
import { addresses } from '../../db/schema';
import { DrizzleAsyncProvider } from '../../db/db.provider';
import { AddressNormalizerService } from './address-normalizer.service';
import {
  ProximitySearchRequest,
  ProximitySearchResult,
  NormalizedAddress,
  AddressMatchCriteria,
  AddressSummary,
} from '../dto/proximity-search.dto';

@Injectable()
export class ProximitySearchService {
  constructor(
    @Inject(DrizzleAsyncProvider)
    private readonly db: Database,
    private readonly addressNormalizer: AddressNormalizerService,
  ) {}

  public async searchNearbyAddresses(
    request: ProximitySearchRequest,
  ): Promise<ProximitySearchResult> {
    const startTime = Date.now();

    // Valores por defecto para paginación
    const page = request.options.page || 1;
    const limit = Math.min(request.options.limit || 10, 100); // Max 100 por página

    const normalizedAddress = this.addressNormalizer.normalizeAddress(request.address);
    
    const { addresses: nearbyAddresses, total } = await this.findAddressesInProximityWithPagination(
      normalizedAddress,
      request.options,
      page,
      limit,
    );

    const addressesWithSimilarity = nearbyAddresses.map((address) => ({
      address: this.mapDbAddressToSummary(address),
      similarity: this.addressNormalizer.calculateAddressSimilarity(
        normalizedAddress,
        this.mapDbAddressToNormalized(address),
      ),
      distance: this.calculateDistance(normalizedAddress, this.mapDbAddressToNormalized(address)),
    }));

    addressesWithSimilarity.sort((a, b) => b.similarity - a.similarity);

    const processingTime = Date.now() - startTime;
    const hasNextPage = (page * limit) < total;
    const hasPrevPage = page > 1;

    return {
      normalizedAddress,
      nearbyAddresses: addressesWithSimilarity,
      searchMetadata: {
        totalFound: total,
        searchRadius: request.options.searchRadius,
        processingTime,
        page,
        limit,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  private async findAddressesInProximityWithPagination(
    normalizedAddress: NormalizedAddress,
    options: any,
    page: number,
    limit: number,
  ): Promise<{ addresses: any[]; total: number }> {
    const baseConditions: any[] = [];
    
    if (normalizedAddress.municipality) {
      baseConditions.push(eq(addresses.municipality, normalizedAddress.municipality));
    }

    if (normalizedAddress.department) {
      baseConditions.push(eq(addresses.department, normalizedAddress.department));
    }

    const proximityConditions = this.buildProximityConditions(normalizedAddress, options);

    const finalConditions = baseConditions.length > 0 
      ? and(...baseConditions, or(...proximityConditions))
      : or(...proximityConditions);

    // Obtener total de resultados
    const totalResults = await this.db
      .select({ count: sql`count(*)::int`.as('count') })
      .from(addresses)
      .where(finalConditions);

    const total = totalResults[0]?.count ? Number(totalResults[0].count) : 0;

    // Obtener resultados paginados
    const offset = (page - 1) * limit;
    const query = this.db
      .select({
        id: addresses.id,
        addressRaw: addresses.addressRaw,
        addressNorm: addresses.addressNorm,
        addressCanonical: addresses.addressCanonical,
        municipality: addresses.municipality,
        neighborhood: addresses.neighborhood,
        transactionValue: addresses.transactionValue,
        areaPrivM2: addresses.areaPrivM2,
        areaConstM2: addresses.areaConstM2,
        viaCode: addresses.viaCode,
        viaLabel: addresses.viaLabel,
        primaryNumber: addresses.primaryNumber,
        secondaryNumber: addresses.secondaryNumber,
        tertiaryNumber: addresses.tertiaryNumber,
        quadrant: addresses.quadrant,
        department: addresses.department,
      })
      .from(addresses)
      .where(finalConditions)
      .limit(limit)
      .offset(offset);

    const addressesResult = await query;

    return { addresses: addressesResult, total };
  }

  private buildProximityConditions(
    normalizedAddress: NormalizedAddress,
    options: any,
  ): any[] {
    const conditions: any[] = [];
    const radius = options.searchRadius;

    if (normalizedAddress.viaCode && normalizedAddress.primaryNumber) {
      const lowerBound = normalizedAddress.primaryNumber - radius;
      const upperBound = normalizedAddress.primaryNumber + radius;

      // Buscar por viaCode normalizado y sus equivalencias
      const viaEquivalents = this.getViaCodeEquivalents(normalizedAddress.viaCode);
      
      conditions.push(
        and(
          or(...viaEquivalents.map(via => eq(addresses.viaCode, via))),
          gte(addresses.primaryNumber, lowerBound),
          lte(addresses.primaryNumber, upperBound),
        ),
      );
    }

    if (options.includeNeighborhoods && normalizedAddress.neighborhood) {
      conditions.push(
        like(addresses.neighborhood, `%${normalizedAddress.neighborhood}%`),
      );
    }

    if (options.includeQuadrants && normalizedAddress.quadrant) {
      conditions.push(eq(addresses.quadrant, normalizedAddress.quadrant));
    }

    if (normalizedAddress.viaLabel) {
      const viaLabelNumber = this.extractNumberFromViaLabel(normalizedAddress.viaLabel);
      if (viaLabelNumber) {
        const lowerVia = viaLabelNumber - Math.floor(radius / 2);
        const upperVia = viaLabelNumber + Math.floor(radius / 2);
        
        conditions.push(
          sql`CASE 
            WHEN REGEXP_REPLACE(${addresses.viaLabel}, '[^0-9]', '', 'g') != '' 
            THEN CAST(REGEXP_REPLACE(${addresses.viaLabel}, '[^0-9]', '', 'g') AS INTEGER) 
            ELSE 0 
          END BETWEEN ${lowerVia} AND ${upperVia}`,
        );
      }
    }

    return conditions.length > 0 ? conditions : [sql`1=1`];
  }

  private extractNumberFromViaLabel(viaLabel: string): number | null {
    const match = viaLabel.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }

  private getViaCodeEquivalents(viaCode: string): string[] {
    // Mapeo de equivalencias para buscar en la BD
    const equivalenceMap: { [key: string]: string[] } = {
      'cl': ['cl', 'calle', 'cll', 'c'],
      'kr': ['kr', 'cr', 'carrera', 'krr', 'carr', 'k'],
      'av': ['av', 'avenida', 'avd', 'ac', 'ak'],
      'tv': ['tv', 'transversal', 'trans'],
      'dg': ['dg', 'diagonal', 'diag'],
      'ap': ['ap', 'autopista'],
    };

    return equivalenceMap[viaCode.toLowerCase()] || [viaCode];
  }

  private mapDbAddressToSummary(dbAddress: any): AddressSummary {
    return {
      id: dbAddress.id,
      addressRaw: dbAddress.addressRaw,
      addressNorm: dbAddress.addressNorm,
      addressCanonical: dbAddress.addressCanonical,
      municipality: dbAddress.municipality,
      neighborhood: dbAddress.neighborhood,
      transactionValue: dbAddress.transactionValue,
      areaPrivM2: dbAddress.areaPrivM2,
      areaConstM2: dbAddress.areaConstM2,
    };
  }

  private mapDbAddressToNormalized(dbAddress: any): NormalizedAddress {
    return {
      viaCode: dbAddress.viaCode,
      viaLabel: dbAddress.viaLabel,
      primaryNumber: dbAddress.primaryNumber,
      secondaryNumber: dbAddress.secondaryNumber,
      tertiaryNumber: dbAddress.tertiaryNumber,
      quadrant: dbAddress.quadrant,
      neighborhood: dbAddress.neighborhood,
      municipality: dbAddress.municipality,
      department: dbAddress.department,
      addressStruct: dbAddress.addressStruct,
    };
  }

  private calculateDistance(address1: NormalizedAddress, address2: NormalizedAddress): number {
    let distance = 0;

    if (address1.primaryNumber && address2.primaryNumber) {
      distance += Math.abs(address1.primaryNumber - address2.primaryNumber);
    }

    if (address1.secondaryNumber && address2.secondaryNumber) {
      distance += Math.abs(address1.secondaryNumber - address2.secondaryNumber) * 0.1;
    }

    const viaDistance = this.calculateViaDistance(address1.viaLabel, address2.viaLabel);
    distance += viaDistance;

    return distance;
  }

  private calculateViaDistance(via1?: string, via2?: string): number {
    if (!via1 || !via2) return 0;

    const num1 = this.extractNumberFromViaLabel(via1);
    const num2 = this.extractNumberFromViaLabel(via2);

    if (num1 && num2) {
      return Math.abs(num1 - num2) * 0.5;
    }

    return 0;
  }

  public async findSimilarAddresses(
    targetAddress: NormalizedAddress,
    criteria: AddressMatchCriteria,
  ): Promise<AddressSummary[]> {
    const conditions: any[] = [];

    if (criteria.viaCodeMatch && targetAddress.viaCode) {
      conditions.push(eq(addresses.viaCode, targetAddress.viaCode));
    }

    if (criteria.neighborhoodMatch && targetAddress.neighborhood) {
      conditions.push(eq(addresses.neighborhood, targetAddress.neighborhood));
    }

    if (criteria.quadrantMatch && targetAddress.quadrant) {
      conditions.push(eq(addresses.quadrant, targetAddress.quadrant));
    }

    if (criteria.municipalityMatch && targetAddress.municipality) {
      conditions.push(eq(addresses.municipality, targetAddress.municipality));
    }

    if (criteria.numberRangeMatch && targetAddress.primaryNumber) {
      const range = 5;
      conditions.push(
        and(
          gte(addresses.primaryNumber, targetAddress.primaryNumber - range),
          lte(addresses.primaryNumber, targetAddress.primaryNumber + range),
        ),
      );
    }

    if (conditions.length === 0) {
      return [];
    }

    const results = await this.db
      .select({
        id: addresses.id,
        addressRaw: addresses.addressRaw,
        addressNorm: addresses.addressNorm,
        addressCanonical: addresses.addressCanonical,
        municipality: addresses.municipality,
        neighborhood: addresses.neighborhood,
        transactionValue: addresses.transactionValue,
        areaPrivM2: addresses.areaPrivM2,
        areaConstM2: addresses.areaConstM2,
      })
      .from(addresses)
      .where(and(...conditions))
      .limit(100);

    return results.map(result => this.mapDbAddressToSummary(result));
  }
}