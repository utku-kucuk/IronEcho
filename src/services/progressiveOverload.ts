import { Workout, ProgressiveOverloadSuggestion } from '../types';
import { realmDB } from '../database/realm';

export interface ExerciseHistory {
  exerciseName: string;
  workouts: {
    date: Date;
    maxWeight: number;
    maxReps: number;
    totalVolume: number;
    sets: number;
  }[];
}

export class ProgressiveOverloadCalculator {
  private userGender: 'male' | 'female';

  constructor(gender: 'male' | 'female') {
    this.userGender = gender;
  }

  // Get exercise history for progressive overload calculation
  async getExerciseHistory(exerciseName: string, userId: string, limit = 10): Promise<ExerciseHistory> {
    const workouts = realmDB.getWorkouts(userId, 100, 0);
    
    const exerciseWorkouts = workouts
      .filter(workout => 
        workout.exercises.some(exercise => 
          exercise.name.toLowerCase() === exerciseName.toLowerCase()
        )
      )
      .map(workout => {
        const exercise = workout.exercises.find(e => 
          e.name.toLowerCase() === exerciseName.toLowerCase()
        );
        
        if (!exercise) return null;

        const maxWeight = Math.max(...exercise.sets.map(set => set.weight || 0));
        const maxReps = Math.max(...exercise.sets.map(set => set.reps));
        const totalVolume = exercise.sets.reduce((sum, set) => 
          sum + (set.weight || 0) * set.reps, 0
        );

        return {
          date: workout.date,
          maxWeight,
          maxReps,
          totalVolume,
          sets: exercise.sets.length
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    return {
      exerciseName,
      workouts: exerciseWorkouts as any[]
    };
  }

  // Calculate progressive overload suggestions
  async calculateProgressiveOverload(
    exerciseName: string, 
    userId: string,
    currentSets: Array<{ reps: number; weight?: number }>
  ): Promise<ProgressiveOverloadSuggestion[]> {
    const history = await this.getExerciseHistory(exerciseName, userId);
    const suggestions: ProgressiveOverloadSuggestion[] = [];

    if (history.workouts.length === 0) {
      // No history, provide basic starting suggestions
      return this.getStartingSuggestions(exerciseName, currentSets);
    }

    const latestWorkout = history.workouts[0];
    const currentMaxWeight = Math.max(...currentSets.map(set => set.weight || 0));
    const currentMaxReps = Math.max(...currentSets.map(set => set.reps));
    const currentVolume = currentSets.reduce((sum, set) => 
      sum + (set.weight || 0) * set.reps, 0
    );

    // Determine exercise type from name or history
    const exerciseType = this.determineExerciseType(exerciseName, latestWorkout);

    // Calculate progression based on exercise type and gender
    const progressionRate = this.getProgressionRate(exerciseType);
    const daysSinceLastWorkout = this.getDaysSinceLastWorkout(latestWorkout.date);

    // Weight-based progression (strength exercises)
    if (exerciseType === 'strength' && currentMaxWeight > 0) {
      const suggestedWeight = this.calculateWeightProgression(
        currentMaxWeight, 
        progressionRate, 
        daysSinceLastWorkout
      );

      if (suggestedWeight > currentMaxWeight) {
        suggestions.push({
          exerciseName,
          currentMax: { weight: currentMaxWeight, reps: currentMaxReps, volume: currentVolume },
          suggested: { weight: suggestedWeight },
          reason: `Increase weight by ${Math.round((suggestedWeight - currentMaxWeight) * 10) / 10}kg based on ${this.userGender} progression rate`,
          type: 'weight'
        });
      }
    }

    // Rep-based progression (bodyweight exercises)
    if (exerciseType === 'bodyweight') {
      const suggestedReps = this.calculateRepProgression(
        currentMaxReps, 
        progressionRate, 
        daysSinceLastWorkout
      );

      if (suggestedReps > currentMaxReps) {
        suggestions.push({
          exerciseName,
          currentMax: { reps: currentMaxReps, volume: currentVolume },
          suggested: { reps: suggestedReps },
          reason: `Increase reps by ${suggestedReps - currentMaxReps} based on bodyweight progression`,
          type: 'reps'
        });
      }

      // Alternative: add one more set
      if (currentSets.length < 5) {
        suggestions.push({
          exerciseName,
          currentMax: { reps: currentMaxReps, volume: currentVolume },
          suggested: { sets: currentSets.length + 1 },
          reason: 'Add one more set for volume progression',
          type: 'sets'
        });
      }
    }

    // Duration-based progression (cardio)
    if (exerciseType === 'cardio') {
      const suggestedDuration = this.calculateDurationProgression(
        currentMaxReps, // Using reps as duration for cardio
        progressionRate,
        daysSinceLastWorkout
      );

      if (suggestedDuration > currentMaxReps) {
        suggestions.push({
          exerciseName,
          currentMax: { reps: currentMaxReps, volume: currentVolume },
          suggested: { duration: suggestedDuration },
          reason: `Increase duration by ${suggestedDuration - currentMaxReps} minutes`,
          type: 'duration'
        });
      }
    }

    // Volume-based progression (if no other progression is possible)
    if (suggestions.length === 0 && currentVolume > 0) {
      const volumeIncrease = Math.round(currentVolume * 0.05); // 5% volume increase
      suggestions.push({
        exerciseName,
        currentMax: { volume: currentVolume },
        suggested: { weight: currentVolume + volumeIncrease },
        reason: 'Increase total volume by 5% for progressive overload',
        type: 'weight'
      });
    }

    return suggestions;
  }

  private getStartingSuggestions(
    exerciseName: string, 
    currentSets: Array<{ reps: number; weight?: number }>
  ): ProgressiveOverloadSuggestion[] {
    const suggestions: ProgressiveOverloadSuggestion[] = [];
    const exerciseType = this.determineExerciseType(exerciseName);

    if (exerciseType === 'strength') {
      suggestions.push({
        exerciseName,
        currentMax: { weight: 0, reps: 0, volume: 0 },
        suggested: { weight: 20 }, // Starting weight
        reason: 'Start with 20kg for strength training',
        type: 'weight'
      });
    } else if (exerciseType === 'bodyweight') {
      suggestions.push({
        exerciseName,
        currentMax: { reps: 0, volume: 0 },
        suggested: { reps: 10 },
        reason: 'Start with 10 reps for bodyweight exercise',
        type: 'reps'
      });
    } else if (exerciseType === 'cardio') {
      suggestions.push({
        exerciseName,
        currentMax: { reps: 0, volume: 0 },
        suggested: { duration: 20 },
        reason: 'Start with 20 minutes for cardio',
        type: 'duration'
      });
    }

    return suggestions;
  }

  private determineExerciseType(exerciseName: string, latestWorkout?: any): 'strength' | 'bodyweight' | 'cardio' {
    const name = exerciseName.toLowerCase();
    
    // Cardio exercises
    if (name.includes('run') || name.includes('bike') || name.includes('swim') || 
        name.includes('row') || name.includes('elliptical') || name.includes('treadmill')) {
      return 'cardio';
    }
    
    // Bodyweight exercises
    if (name.includes('push') || name.includes('pull') || name.includes('sit') || 
        name.includes('plank') || name.includes('burpee') || name.includes('jump')) {
      return 'bodyweight';
    }
    
    // Check if exercise uses weights in history
    if (latestWorkout && latestWorkout.maxWeight > 0) {
      return 'strength';
    }
    
    // Default to strength for most exercises
    return 'strength';
  }

  private getProgressionRate(exerciseType: 'strength' | 'bodyweight' | 'cardio'): number {
    const baseRate = this.userGender === 'male' ? 0.075 : 0.04; // 7.5% vs 4%
    
    switch (exerciseType) {
      case 'strength':
        return baseRate;
      case 'bodyweight':
        return baseRate * 0.8; // Slightly lower for bodyweight
      case 'cardio':
        return baseRate * 0.6; // Lower for cardio
      default:
        return baseRate;
    }
  }

  private getDaysSinceLastWorkout(lastWorkoutDate: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastWorkoutDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateWeightProgression(
    currentWeight: number, 
    progressionRate: number, 
    daysSinceLastWorkout: number
  ): number {
    // Reduce progression if too much time has passed
    const timeFactor = Math.min(1, Math.max(0.5, 1 - (daysSinceLastWorkout - 7) * 0.1));
    const adjustedRate = progressionRate * timeFactor;
    
    const newWeight = currentWeight * (1 + adjustedRate);
    
    // Round to nearest 2.5kg (standard plate increments)
    return Math.round(newWeight / 2.5) * 2.5;
  }

  private calculateRepProgression(
    currentReps: number, 
    progressionRate: number, 
    daysSinceLastWorkout: number
  ): number {
    const timeFactor = Math.min(1, Math.max(0.5, 1 - (daysSinceLastWorkout - 7) * 0.1));
    const adjustedRate = progressionRate * timeFactor;
    
    const repIncrease = Math.round(currentReps * adjustedRate);
    return currentReps + Math.max(1, repIncrease);
  }

  private calculateDurationProgression(
    currentDuration: number, 
    progressionRate: number, 
    daysSinceLastWorkout: number
  ): number {
    const timeFactor = Math.min(1, Math.max(0.5, 1 - (daysSinceLastWorkout - 7) * 0.1));
    const adjustedRate = progressionRate * timeFactor;
    
    const durationIncrease = Math.round(currentDuration * adjustedRate);
    return currentDuration + Math.max(1, durationIncrease);
  }

  // Check if current workout is a PR
  async isPersonalRecord(
    exerciseName: string, 
    userId: string, 
    currentVolume: number
  ): Promise<boolean> {
    const history = await this.getExerciseHistory(exerciseName, userId, 50);
    
    if (history.length === 0) {
      return true; // First workout is always a PR
    }
    
    const maxVolume = Math.max(...history.map(w => w.totalVolume));
    return currentVolume > maxVolume;
  }
}

// Export singleton instance
export const progressiveOverloadCalculator = new ProgressiveOverloadCalculator('male');
