import { Injectable } from '@nestjs/common';
import { NormalizedAddress } from '../dto/proximity-search.dto';

@Injectable()
export class AddressNormalizerService {
  
  public normalizeAddress(rawAddress: string): NormalizedAddress {
    const normalized: NormalizedAddress = {};
    const cleanAddress = rawAddress.trim().toLowerCase();

    normalized.viaCode = this.extractViaCode(cleanAddress);
    normalized.viaLabel = this.extractViaLabel(cleanAddress);
    
    const numbers = this.extractNumbers(cleanAddress);
    normalized.primaryNumber = numbers.primary;
    normalized.secondaryNumber = numbers.secondary;
    normalized.tertiaryNumber = numbers.tertiary;

    normalized.quadrant = this.extractQuadrant(cleanAddress);
    normalized.neighborhood = this.extractNeighborhood(cleanAddress);
    normalized.municipality = this.extractMunicipality(cleanAddress);
    normalized.department = this.extractDepartment(cleanAddress);

    normalized.addressStruct = this.buildStructuredAddress(normalized);

    return normalized;
  }

  private extractViaCode(address: string): string | undefined {
    const viaPatterns = [
      // Calle y variaciones
      /\b(calle|cl|cll)\s+(\d+[a-z]*)/gi,
      // Carrera y variaciones  
      /\b(carrera|cr|krr|carr|kr|k)\s+(\d+[a-z]*)/gi,
      // Avenida y variaciones
      /\b(avenida|av|avd|ac|ak)\s+(\d+[a-z]*)/gi,
      // Transversal y variaciones
      /\b(transversal|tv|trans)\s+(\d+[a-z]*)/gi,
      // Diagonal y variaciones
      /\b(diagonal|dg|diag)\s+(\d+[a-z]*)/gi,
      // Autopista
      /\b(autopista|ap)\s+(\d+[a-z]*)/gi,
      // Calle especial (sin número pero con letras)
      /\b(c)\s+(\d+[a-z\s]*)/gi,
    ];

    // Mapeo de abreviaciones a códigos normalizados
    const viaCodeMap: { [key: string]: string } = {
      // Calle
      'calle': 'cl',
      'cl': 'cl',
      'cll': 'cl',
      'c': 'cl',
      // Carrera
      'carrera': 'kr',
      'cr': 'kr',
      'krr': 'kr',
      'carr': 'kr',
      'kr': 'kr',
      'k': 'kr',
      // Avenida y autopistas
      'avenida': 'av',
      'av': 'av',
      'avd': 'av',
      'ac': 'av', // Avenida Calle
      'ak': 'av', // Avenida Carrera
      'autopista': 'ap',
      'ap': 'ap',
      // Transversal
      'transversal': 'tv',
      'tv': 'tv',
      'trans': 'tv',
      // Diagonal
      'diagonal': 'dg',
      'dg': 'dg',
      'diag': 'dg',
    };

    for (const pattern of viaPatterns) {
      const match = pattern.exec(address);
      if (match) {
        const viaType = match[1].toLowerCase();
        return viaCodeMap[viaType] || viaType;
      }
    }
    return undefined;
  }

  private extractViaLabel(address: string): string | undefined {
    const viaPatterns = [
      // Calle y variaciones
      /\b(calle|cl|cll|c)\s+(\d+[a-z]*)/gi,
      // Carrera y variaciones  
      /\b(carrera|cr|krr|carr|kr|k)\s+(\d+[a-z]*)/gi,
      // Avenida y variaciones (incluyendo AC, AK)
      /\b(avenida|av|avd|ac|ak)\s+(\d+[a-z]*)/gi,
      // Transversal y variaciones
      /\b(transversal|tv|trans)\s+(\d+[a-z]*)/gi,
      // Diagonal y variaciones
      /\b(diagonal|dg|diag)\s+(\d+[a-z]*)/gi,
      // Autopista
      /\b(autopista|ap)\s+(\d+[a-z]*)/gi,
    ];

    for (const pattern of viaPatterns) {
      const match = pattern.exec(address);
      if (match) {
        return match[2];
      }
    }
    return undefined;
  }

  private extractNumbers(address: string): {
    primary?: number;
    secondary?: number;
    tertiary?: number;
  } {
    // Limpiar la dirección de texto descriptivo pero conservar números importantes
    const cleanAddress = address
      .replace(/(?:apartment|ap|interior|in|tower|to|garage|gj|block|bl|bq|edificio|ed|casa|ca|local|lc|piso|ps|oficina|of)\s+\d+/gi, '')
      .replace(/int\.\s*\d+/gi, '') // Remover "INT. 9906"
      .toLowerCase();

    // Paso 1: Extraer número de la vía (parte más importante)
    const viaMatch = this.extractViaNumbers(cleanAddress);
    if (viaMatch) {
      return viaMatch;
    }

    // Paso 2: Fallback a patrones generales
    const fallbackMatch = /\b(\d+)(?:[-\s]+(\d+))?(?:[-\s]+(\d+))?\b/.exec(cleanAddress);
    return fallbackMatch ? {
      primary: parseInt(fallbackMatch[1]),
      secondary: fallbackMatch[2] ? parseInt(fallbackMatch[2]) : undefined,
      tertiary: fallbackMatch[3] ? parseInt(fallbackMatch[3]) : undefined,
    } : {};
  }

  private extractViaNumbers(address: string): {
    primary?: number;
    secondary?: number;
    tertiary?: number;
  } | null {
    // Patrones específicos para diferentes formatos de direcciones
    const patterns = [
      // AC 68 SUR 70 70 → vía=68, primary=70, secondary=70
      {
        regex: /(?:ac|ak|av)\s+(\d+[a-z]*)\s+(?:sur|norte|este|oeste)?\s*(\d+)\s+(\d+)/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // DIAGONAL 80 # 7 - 100 → vía=80, primary=7, secondary=100  
      {
        regex: /(?:diagonal|dg|diag)\s+(\d+[a-z]*)\s*#\s*(\d+)(?:\s*[-]\s*(\d+))?/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // KR 19A 159 84 → vía=19, primary=159, secondary=84
      {
        regex: /(?:kr|carrera|cr|carr|k)\s+(\d+[a-z]*)\s+(\d+[a-z]*)\s+(\d+)/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // TV 65 59 21 SUR → vía=65, primary=59, secondary=21
      {
        regex: /(?:tv|transversal|trans)\s+(\d+[a-z]*)\s+(\d+[a-z]*)\s+(\d+)/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // CL 152B 73 36 → vía=152, primary=73, secondary=36
      {
        regex: /(?:cl|calle|cll|c)\s+(\d+[a-z]*)\s+(\d+[a-z]*)\s+(\d+)/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // Patrón con # más genérico: KR 81 #55-30
      {
        regex: /(?:kr|cl|av|tv|dg|ac|ak|carrera|calle|avenida|transversal|diagonal|c|k)\s+(\d+[a-z]*)\s*#\s*(\d+)(?:[-\s]+(\d+))?/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      },
      // Patrón sin # más genérico: KR 81 55 30
      {
        regex: /(?:kr|cl|av|tv|dg|ac|ak|carrera|calle|avenida|transversal|diagonal|c|k)\s+(\d+[a-z]*)\s+(\d+[a-z]*)(?:\s+(\d+))?/gi,
        viaPos: 1, primaryPos: 2, secondaryPos: 3
      }
    ];

    for (const pattern of patterns) {
      const match = pattern.regex.exec(address);
      if (match) {
        const viaNumber = this.extractNumberFromString(match[pattern.viaPos]);
        const primary = this.extractNumberFromString(match[pattern.primaryPos]);
        const secondary = pattern.secondaryPos && match[pattern.secondaryPos] 
          ? this.extractNumberFromString(match[pattern.secondaryPos]) 
          : undefined;

        // Para direcciones como "AC 68 SUR 70 70", el número principal debe ser después de la vía
        return {
          primary: primary || viaNumber,
          secondary: secondary,
          tertiary: undefined
        };
      }
    }

    return null;
  }

  private extractNumberFromString(str: string): number | undefined {
    if (!str) return undefined;
    const match = str.match(/\d+/);
    return match ? parseInt(match[0]) : undefined;
  }

  private extractQuadrant(address: string): string | undefined {
    const quadrantPattern = /\b(norte|sur|este|oeste|noreste|noroeste|sureste|suroeste)\b/gi;
    const match = quadrantPattern.exec(address);
    return match ? match[1].toLowerCase() : undefined;
  }

  private extractNeighborhood(address: string): string | undefined {
    const neighborhoodPatterns = [
      /\bbarrio\s+([a-záéíóúñü\s]+)/gi,
      /\bb\.\s+([a-záéíóúñü\s]+)/gi,
      /\bbrr\.\s+([a-záéíóúñü\s]+)/gi,
    ];

    for (const pattern of neighborhoodPatterns) {
      const match = pattern.exec(address);
      if (match) {
        return match[1].trim();
      }
    }
    return undefined;
  }

  private extractMunicipality(address: string): string | undefined {
    const municipalityKeywords = ['bogotá', 'medellín', 'cali', 'barranquilla', 'cartagena'];
    
    for (const municipality of municipalityKeywords) {
      if (address.includes(municipality)) {
        return municipality;
      }
    }
    return undefined;
  }

  private extractDepartment(address: string): string | undefined {
    const departmentKeywords = ['cundinamarca', 'antioquia', 'valle del cauca', 'atlántico', 'bolívar'];
    
    for (const department of departmentKeywords) {
      if (address.includes(department)) {
        return department;
      }
    }
    return undefined;
  }

  private buildStructuredAddress(normalized: NormalizedAddress): string {
    const parts: string[] = [];
    
    if (normalized.viaCode && normalized.viaLabel) {
      parts.push(`${normalized.viaCode} ${normalized.viaLabel}`);
    }
    
    if (normalized.primaryNumber) {
      parts.push(`#${normalized.primaryNumber}`);
      
      if (normalized.secondaryNumber) {
        parts.push(`-${normalized.secondaryNumber}`);
        
        if (normalized.tertiaryNumber) {
          parts.push(`-${normalized.tertiaryNumber}`);
        }
      }
    }

    if (normalized.neighborhood) {
      parts.push(`Barrio ${normalized.neighborhood}`);
    }

    if (normalized.municipality) {
      parts.push(normalized.municipality);
    }

    return parts.join(' ');
  }

  public calculateAddressSimilarity(address1: NormalizedAddress, address2: NormalizedAddress): number {
    let score = 0;
    let maxScore = 0;

    // Via code similarity (peso: 3)
    maxScore += 3;
    if (address1.viaCode === address2.viaCode) {
      score += 3;
    }

    // Via label similarity (peso: 2)
    maxScore += 2;
    if (address1.viaLabel === address2.viaLabel) {
      score += 2;
    }

    // Primary number similarity (peso: 2)
    maxScore += 2;
    if (address1.primaryNumber && address2.primaryNumber) {
      const diff = Math.abs(address1.primaryNumber - address2.primaryNumber);
      if (diff === 0) score += 2;
      else if (diff <= 2) score += 1;
    }

    // Neighborhood similarity (peso: 2)
    maxScore += 2;
    if (address1.neighborhood === address2.neighborhood) {
      score += 2;
    }

    // Municipality similarity (peso: 1)
    maxScore += 1;
    if (address1.municipality === address2.municipality) {
      score += 1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }
}