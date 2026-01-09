import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recommendation } from './entities/recommendation.entity';

@Injectable()
export class RecommendationsService {
  constructor(
    @InjectRepository(Recommendation)
    private recommendationRepository: Repository<Recommendation>,
  ) { }

  getFeed() {
    // This is a stub implementation
    // In production, this would fetch personalized recommendations
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

  async createForEvent(eventId: string) {
    // This is a stub implementation
    // In production, this would analyze event data and user preferences
    // to generate personalized recommendations

    // Delete existing recommendations for this event
    await this.recommendationRepository.delete({ eventId });

    // Create mock recommendations
    const mockRecommendations = [
      {
        eventId,
        title: 'Italian Restaurant',
        score: 0.92,
        rank: 1,
      },
      {
        eventId,
        title: 'Rooftop Bar',
        score: 0.87,
        rank: 2,
      },
      {
        eventId,
        title: 'Escape Room',
        score: 0.81,
        rank: 3,
      },
    ];

    const recommendations = mockRecommendations.map((rec) =>
      this.recommendationRepository.create(rec),
    );

    await this.recommendationRepository.save(recommendations);

    return {
      message: 'Recommendations created successfully',
      count: recommendations.length,
      recommendations,
    };
  }

  async getEventRecommendations(eventId: string) {
    const recommendations = await this.recommendationRepository.find({
      where: { eventId },
      order: { rank: 'ASC' },
    });

    return {
      eventId,
      recommendations,
      count: recommendations.length,
    };
  }
}
