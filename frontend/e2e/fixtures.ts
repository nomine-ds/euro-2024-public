import { Page } from "@playwright/test";

const API_PATTERN = /\/api\/|\/functions\/v1\//;

const mockTeams = [
  { team_id: 768, team_name: "England" },
  { team_id: 770, team_name: "Germany" },
  { team_id: 772, team_name: "Spain" },
];

const mockPlayers = Array.from({ length: 30 }, (_, i) => ({
  player_id: i + 1,
  player_name: ["Harry Kane", "Jude Bellingham", "Rodri", "Kylian Mbappe"][i % 4] + " " + (i + 1),
  team_name: ["England", "Spain", "France", "Germany"][i % 4],
  goals: 30 - i,
  assists: i % 5,
  shots: 20 - (i % 10),
  passes: 100 - i,
  xg: 2.5 - i * 0.05,
  xa: 1.2 - i * 0.02,
}));

const mockCompare = {
  team_a: {
    team_id: 768,
    team_name: "England",
    goals: 13,
    shots: 81,
    passes: 4535,
    xG: 10.49,
    tackles: 192,
    interceptions: 38,
    clearances: 97,
  },
  team_b: {
    team_id: 770,
    team_name: "Germany",
    goals: 11,
    shots: 95,
    passes: 3401,
    xG: 8.73,
    tackles: 137,
    interceptions: 37,
    clearances: 69,
  },
};

export async function mockApi(page: Page) {
  await page.route(API_PATTERN, async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    let body: unknown = {};

    if (url.match(/\/compare\/teams/)) {
      body = mockCompare;
    } else if (url.match(/\/teams(\?|$)/)) {
      body = mockTeams;
    } else if (url.match(/\/players\/bulk/)) {
      body = mockPlayers;
    } else if (url.match(/\/players\/clustering/)) {
      body = { n_clusters: 4, players: [] };
    } else if (url.match(/\/players(\?|$)/)) {
      body = mockPlayers;
    } else if (url.match(/\/matches\/with360/)) {
      body = [{ match_id: 1 }, { match_id: 2 }];
    } else if (url.match(/\/matches/)) {
      body = [
        { match_id: 1, home_team: "England", away_team: "Germany" },
        { match_id: 2, home_team: "Spain", away_team: "France" },
      ];
    } else if (url.match(/\/health/)) {
      body = { status: "ok", total_events: 1234 };
    } else {
      // Root endpoint (used for stats)
      body = { total_events: 1234 };
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}