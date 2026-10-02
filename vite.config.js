import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        app: 'app.html',
        guides: 'guides.html',
        gettingStarted: 'guides/getting-started.html',
        challenge365: 'guides/365-day-challenge.html',
        recoverStreak: 'guides/recover-a-streak.html',
        weeklyReview: 'guides/weekly-review.html',
        howManyHabits: 'guides/how-many-habits.html',
        habitVsToDo: 'guides/habit-vs-to-do.html',
        goalToHabit: 'guides/goal-to-habit.html',
        review30Days: 'guides/review-30-days.html',
        about: 'about.html',
        contact: 'contact.html',
        privacy: 'privacy.html',
        terms: 'terms.html',
        error404: '404.html'
      }
    }
  }
});
