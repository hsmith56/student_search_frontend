# PostHog post-wizard report

The wizard has completed a deep integration of your project. PostHog analytics have been added across client-side authentication flows, student search interactions, and feedback submission. The integration uses the Next.js 15.3+ `instrumentation-client.ts` pattern for client-side initialization (no PostHogProvider required), a server-side singleton in `lib/posthog-server.ts` for API route usage, and a reverse proxy via Next.js rewrites to avoid ad blockers. Users are identified on login and signup via `posthog.identify()` and the identity is cleared on logout via `posthog.reset()`. Exception tracking is enabled via `capture_exceptions: true` and `posthog.captureException()` on database update errors.

| Event | Description | File |
|---|---|---|
| `user_signed_in` | Fired when a user successfully logs in | `contexts/auth-context.tsx` |
| `user_signed_up` | Fired when a user successfully creates a new account | `contexts/auth-context.tsx` |
| `user_signed_out` | Fired when a user logs out | `contexts/auth-context.tsx` |
| `student_search_executed` | Fired when a user runs a student search (clicks Find Students or presses Enter) | `features/student-search/hooks/use-student-search-controller.ts` |
| `student_filters_applied` | Fired when a user applies filters from the filter dialog, including active filter count | `features/student-search/hooks/use-student-search-controller.ts` |
| `student_filters_cleared` | Fired when a user clears all search filters | `features/student-search/hooks/use-student-search-controller.ts` |
| `student_favorited` | Fired when a user favorites a student | `features/student-search/hooks/use-student-search-controller.ts` |
| `student_unfavorited` | Fired when a user removes a student from favorites | `features/student-search/hooks/use-student-search-controller.ts` |
| `favorites_viewed` | Fired when a user views their favorites list | `features/student-search/hooks/use-student-search-controller.ts` |
| `database_update_triggered` | Fired when an admin triggers a database update | `features/student-search/hooks/use-student-search-controller.ts` |
| `feedback_submitted` | Fired when a user successfully submits feedback | `features/student-search/hooks/use-feedback-form.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics dashboard](https://us.posthog.com/project/331811/dashboard/1352342)
- [User Sign-in & Sign-up Trend](https://us.posthog.com/project/331811/insights/1JMtWI7O)
- [Search-to-Favorite Conversion Funnel](https://us.posthog.com/project/331811/insights/cqfwlmCo)
- [Search & Filter Activity](https://us.posthog.com/project/331811/insights/HqWtiC0T)
- [Favorites Engagement](https://us.posthog.com/project/331811/insights/uqnmoAzE)
- [Feedback Submissions & Sign-outs](https://us.posthog.com/project/331811/insights/wZpunK4Y)

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
