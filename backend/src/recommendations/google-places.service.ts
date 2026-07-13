import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GooglePlacesTextSearchRequest {
  textQuery: string;
  includedType?: string;
  minRating?: number;
  priceLevels?: string[];
  pageSize?: number;
  regionCode?: string;
}

export interface GooglePlacesOpeningPeriod {
  open?: {
    day?: number;
    hour?: number;
    minute?: number;
  };
  close?: {
    day?: number;
    hour?: number;
    minute?: number;
  };
}

export interface GooglePlacesOpeningHours {
  periods?: GooglePlacesOpeningPeriod[];
  weekdayDescriptions?: string[];
}

export interface GooglePlacePhotoAttribution {
  displayName?: string;
  uri?: string;
  photoUri?: string;
}

interface GooglePlaceLocalizedText {
  text?: string;
  languageCode?: string;
}

interface GooglePlaceGenerativeSummary {
  overview?: GooglePlaceLocalizedText;
  description?: GooglePlaceLocalizedText;
}

export interface GooglePlaceCandidate {
  id: string;
  displayName: string;
  formattedAddress: string;
  description?: string;
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  types?: string[];
  primaryType?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  regularOpeningHours?: GooglePlacesOpeningHours;
  currentOpeningHours?: GooglePlacesOpeningHours;
  photoName?: string;
  photoAttributions?: GooglePlacePhotoAttribution[];
  searchQuery: string;
}

interface PlacesApiResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    editorialSummary?: GooglePlaceLocalizedText;
    generativeSummary?: GooglePlaceGenerativeSummary;
    rating?: number;
    userRatingCount?: number;
    priceLevel?: string;
    types?: string[];
    primaryType?: string;
    googleMapsUri?: string;
    businessStatus?: string;
    regularOpeningHours?: GooglePlacesOpeningHours;
    currentOpeningHours?: GooglePlacesOpeningHours;
    photos?: Array<{
      name?: string;
      authorAttributions?: GooglePlacePhotoAttribution[];
    }>;
  }>;
}

interface PlacePhotoResponse {
  photoUri?: string;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly endpoint = 'https://places.googleapis.com/v1/places:searchText';
  private readonly requestTimeoutMs: number;
  private readonly fieldMask = [
    'places.id',
    'places.displayName',
    'places.formattedAddress',
    'places.editorialSummary',
    'places.generativeSummary',
    'places.rating',
    'places.userRatingCount',
    'places.priceLevel',
    'places.types',
    'places.primaryType',
    'places.googleMapsUri',
    'places.businessStatus',
    'places.regularOpeningHours',
    'places.currentOpeningHours',
    'places.photos',
  ].join(',');

  constructor(private readonly configService: ConfigService) {
    this.requestTimeoutMs = Number(this.configService.get<string>('GOOGLE_PLACES_TIMEOUT_MS')) || 8000;
  }

  isConfigured() {
    return Boolean(this.getApiKey());
  }

  async searchText(request: GooglePlacesTextSearchRequest): Promise<GooglePlaceCandidate[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error('GOOGLE_PLACES_API_KEY or GOOGLE_API_KEY is required for Google Places integration.');
    }

    const body: Record<string, any> = {
      textQuery: request.textQuery,
      pageSize: Math.min(Math.max(request.pageSize ?? 10, 1), 20),
    };

    if (request.includedType) body.includedType = request.includedType;
    if (request.minRating !== undefined) body.minRating = request.minRating;
    if (request.priceLevels?.length) body.priceLevels = request.priceLevels;
    if (request.regionCode) body.regionCode = request.regionCode;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': this.fieldMask,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });

    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`Google Places search failed (${response.status}): ${errorText}`);
      throw new Error(`Google Places search failed with status ${response.status}`);
    }

    const payload = (await response.json()) as PlacesApiResponse;

    return (payload.places ?? [])
      .filter((place) => place.id && place.displayName?.text && place.formattedAddress)
      .map((place) => ({
        id: place.id!,
        displayName: place.displayName!.text!,
        formattedAddress: place.formattedAddress!,
        description: this.getPlaceDescription(place),
        rating: place.rating,
        userRatingCount: place.userRatingCount,
        priceLevel: place.priceLevel,
        types: place.types,
        primaryType: place.primaryType,
        googleMapsUri: place.googleMapsUri,
        businessStatus: place.businessStatus,
        regularOpeningHours: place.regularOpeningHours,
        currentOpeningHours: place.currentOpeningHours,
        photoName: place.photos?.[0]?.name,
        photoAttributions: place.photos?.[0]?.authorAttributions,
        searchQuery: request.textQuery,
      }));
  }

  private getPlaceDescription(place: NonNullable<PlacesApiResponse['places']>[number]) {
    return (
      place.editorialSummary?.text ||
      place.generativeSummary?.overview?.text ||
      place.generativeSummary?.description?.text
    )?.trim();
  }

  async getPhotoUri(photoName: string, maxWidthPx = 900, maxHeightPx = 600): Promise<string | undefined> {
    const apiKey = this.getApiKey();
    if (!apiKey) return undefined;

    const params = new URLSearchParams({
      key: apiKey,
      maxWidthPx: String(maxWidthPx),
      maxHeightPx: String(maxHeightPx),
      skipHttpRedirect: 'true',
    });

    const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${params.toString()}`, {
      signal: AbortSignal.timeout(this.requestTimeoutMs),
    });
    if (!response.ok) {
      const errorText = await response.text();
      this.logger.warn(`Google Places photo fetch failed (${response.status}): ${errorText}`);
      return undefined;
    }

    const payload = (await response.json()) as PlacePhotoResponse;
    return payload.photoUri;
  }

  private getApiKey() {
    return this.configService.get<string>('GOOGLE_PLACES_API_KEY');
  }
}
