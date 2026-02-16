export type ToolTutorialStep = {
  title: string
  description: string
}

export const TOOL_TUTORIAL_STEPS: ToolTutorialStep[] = [
  {
    title: "Filter students quickly",
    description:
      "Click the filter button to the left of the search to expose all of the different parameters to refine your search. Press 'Clear Filters' to reset the filters back to default.",
  },
  {
    title: "Keyword Search",
    description:
      "The free text search allows you to query any part of a student's application. It allows for some errors in case a profile has spelling mistakes. Press enter to search, or click the 'Find Students' button.",
  },
  {
    title: "USAHS ID Search",
    description:
      "Typing into the usahs ID search area will automatically begin filtering the results as you type. You can search for any part of an Id, ie 'r1', 'TX', 'EP' etc.",
  },
  {
    title: "Photo Search",
    description:
      "Photo search specifically looks at the student's photo comments and tries to locate keywords in the included comments. This does not actually look at photo's or analyze pictures.",
  },
  {
    title: "Staff - Update table",
    description:
      "If you are a staff member, then you can update the table by pressing 'update' at the top of the page. This can be done once every 4 hours by any staff member.",
  },
  {
    title: "Keep track with Favorites",
    description:
      "Press the heart button on a row or on a student profile page to add it to your favorites. To view your favorites, simply press the 'My Favorites' square at the top of the page. Pressing the heart again will un-favorite a student.",
  },
  {
    title: "Define your States",
    description:
      "Press the settings button in the top right to bring up the state selector. Use this to define your specific interest states. You can then use the State filter option 'My States Only' to look for students who have explicitly requested your defined states.",
  },
  {
    title: "Students with a 📍",
    description:
      "If you see a student with a 📍 next to their country, this indicates they have a state request. Click the country name to swap their interests with their state request, and click again to swap back.",
  },
  {
    title: "Open full student profiles",
    description:
      "Click any student's name in a row or card to open detailed profile information. Clicking on their ID will redirect you to their profile in Beacon.",
  },
  {
    title: "View updates",
    description:
      "Use News Feed to monitor profile status changes. You can search for a student's name, as well as only show a specific status or even only show students you have favorited.",
  },
  {
    title: "Share your feedback",
    description:
      "Use the Feedback section to submit requests or to notify me (the developer) of any mistakes or things that could be improved.",
  },
  // {
  //   title: "Review performance trends",
  //   description:
  //     "Use Dashboard and RPM views to track placement momentum and stale segments. Watch trend changes over time to prioritize outreach.",
  // },
]
