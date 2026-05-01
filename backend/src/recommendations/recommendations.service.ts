import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './entities/recommendation.entity';
import { Event } from '../events/entities/event.entity';
import { GoogleGenerativeAI, SchemaType, ObjectSchema } from '@google/generative-ai';
import { Venue } from '../venues/entities/venue.entity';
import { SlideAnswer } from 'src/slides/entities/slide-answer.entity';
import { SlidesService } from 'src/slides/slides.service';

export interface RecommendationResult {
  title: string;
  description: string;
  address: string;
}

export interface GenerateRecommendationResponse {
  success: boolean;
  data?: RecommendationResult;
  message?: string;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private venueRepository: Repository<Venue>,
    // @InjectRepository(SlideAnswer)
    private slideAnswerService: SlidesService,
  ) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is required for Gemini integration.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  getFeed() {
    const mockRecommendations = [
      {
        id: '1',
        title: 'Coffee Shop Meet-up',
        score: 0.95,
        rank: 1,
      },
      {
        id: '2',
        title: 'Beach Volleyball',
        score: 0.88,
        rank: 2,
      },
      {
        id: '3',
        title: 'Movie Night',
        score: 0.82,
        rank: 3,
      },
    ];

    return {
      recommendations: mockRecommendations,
      count: mockRecommendations.length,
    };
  }

  async generateRecommendation(eventId: string): Promise<GenerateRecommendationResponse> {
    console.log('here');

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: [],
    });
    console.log(event);

    if (!event) {
      return {
        success: false,
        message: `Event with id ${eventId} not found`,
      };
    }
    const eventAnswers = await this.slideAnswerService.getEventAnswers(eventId);
    console.log(eventAnswers);

    const input = {
      targetDate: event.targetDate || 'flexible',
      locationCity: event.locationCity || 'local area',
      locationCountry: event.locationCountry || 'local area',
      participantCount: event.participantCount || 1,
      eventType: event.eventType || 'casual',
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const prompt = this.buildPrompt(input, eventAnswers);
        console.log(prompt);
        const rawResponse = await this.callGeminiModel(prompt);
        const recommendedEvent = this.parseGeminiResponse(rawResponse, input);
        console.log('recommendedEvent', recommendedEvent);

        const recommendation = this.recommendationRepository.create({
          title: recommendedEvent.title,
          description: recommendedEvent.description,
          address: recommendedEvent.address,
        });

        const savedRecommendation = await this.recommendationRepository.save(recommendation);
        event.recommendation.id = savedRecommendation.id;
        await this.eventRepository.save(event);

        return {
          success: true,
          data: recommendedEvent,
        };
      } catch (error: any) {
        lastError = error as Error;
        this.logger.warn(`Recommendation attempt ${attempt} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    return {
      success: false,
      message: `Failed to generate recommendation after ${maxRetries} attempts. Last error: ${lastError?.message}`,
    };
  }

  private buildPrompt(
    input: {
      targetDate: string;
      locationCity: string;
      locationCountry: string;
      participantCount: number;
      eventType: string;
    },
    eventAnswers: any[] = [],
  ): string {
    const slideAnswersText = eventAnswers.map((answer) => `- ${answer.question}: ${answer.answerValue}`).join('\n');

    return `You are a friendly event planner. Build exactly one structured event recommendation based on the following event details:

- Event Type: ${input.eventType}
- Target Date: ${input.targetDate}
- Location: ${input.locationCity}, ${input.locationCountry}
- Number of Participants: ${input.participantCount}

User Preferences (from slide answers):
${slideAnswersText || 'No preferences provided'}

Create a single best event recommendation that fits these criteria and user preferences.`;
  }

  private async callGeminiModel(prompt: string): Promise<string> {
    const modelName = process.env.GOOGLE_GEMINI_MODEL || 'gemini-2.5-flash';
    const model = this.genAI.getGenerativeModel({ model: modelName });

    const responseSchema: ObjectSchema = {
      type: SchemaType.OBJECT,
      properties: {
        recommendedEvent: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
          },
          required: ['title', 'description', 'address'],
        },
      },
      required: ['recommendedEvent'],
    };

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });
      const response = await result.response;
      const text = response.text();
      return text;
    } catch (error: any) {
      this.logger.error(`Gemini API error: ${error.message}`);
      throw new Error(`Failed to generate recommendation: ${error.message}`);
    }
  }

  private parseGeminiResponse(
    responseText: string,
    input: {
      targetDate: string;
      locationCity: string;
      locationCountry: string;
      participantCount: number;
      eventType: string;
    },
  ): RecommendationResult {
    try {
      const parsed = JSON.parse(responseText.trim());
      if (parsed && parsed.recommendedEvent) {
        const event = parsed.recommendedEvent;
        return {
          title: event.title || `${input.eventType} Event on ${input.targetDate}`,
          description:
            event.description ||
            `A ${input.eventType} event for ${input.participantCount} people in ${input.locationCity}`,
          address: event.address || `${input.locationCity}, ${input.locationCountry}`,
        };
      }
    } catch (error: any) {
      this.logger.warn(`Failed to parse Gemini response as JSON: ${error.message}`);
    }

    throw new Error('Failed to parse recommendation response from Gemini model');
  }
}
