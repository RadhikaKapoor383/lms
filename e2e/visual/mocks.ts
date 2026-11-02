import type { Page } from "@playwright/test";

// The visual tests never talk to a real server. Every request the website
// makes to the API is answered here, so the pages always show the same data
// and no database, Redis or email account is needed.
export const API_URL = (process.env.E2E_API_URL || "http://localhost:8000/api/v1").replace(/\/+$/, "");

const courses = [
  {
    _id: "c1",
    name: "JavaScript from Scratch",
    description: "A calm, step-by-step path from variables to your first real project.",
    level: "Beginner",
    price: 49,
    estimatedPrice: 79,
    category: { name: "Programming" },
    instructor: { name: "A. Khan" },
    reviewCount: 12,
    ratings: 4.7,
  },
  {
    _id: "c2",
    name: "Digital Marketing Foundations",
    description: "Channels, funnels and measurement, explained without the jargon.",
    level: "Beginner",
    price: 39,
    category: { name: "Digital Marketing" },
    instructor: { name: "S. Raza" },
    reviewCount: 0,
    ratings: 0,
  },
  {
    _id: "c3",
    name: "Logo & Brand Design",
    description: "Build a simple brand kit from sketches to final files.",
    level: "Intermediate",
    price: 59,
    category: { name: "Graphic Design" },
    instructor: { name: "M. Ali" },
    reviewCount: 5,
    ratings: 4.5,
  },
];

const announcements = [
  { _id: "a1", title: "New", message: "Lesson discussions are now live.", createdAt: "2026-01-01T00:00:00.000Z" },
];

export async function mockApi(page: Page) {
  await page.route(`${API_URL}/**`, async (route) => {
    const request = route.request();
    const cors = {
      "access-control-allow-origin": request.headers()["origin"] || "*",
      "access-control-allow-credentials": "true",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    };
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204, headers: cors });
    }

    const { pathname } = new URL(request.url());
    let status = 401; // anything else (e.g. /me): "not logged in"
    let body: unknown = { success: false, message: "Please log in" };

    if (pathname.endsWith("/announcements")) {
      status = 200;
      body = { success: true, announcements };
    } else if (pathname.endsWith("/get-courses")) {
      status = 200;
      body = { success: true, courses };
    }

    await route.fulfill({
      status,
      headers: cors,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}
