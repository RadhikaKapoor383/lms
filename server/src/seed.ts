import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

import connectDB from "./utils/db";
import userModel from "./models/user.model";
import CourseModel from "./models/course.model";

const ADMIN_EMAIL = "admin@ledger.dev";
const ADMIN_PASSWORD = "admin1234";

const sampleCourses = [
  {
    name: "Complete Web Development with the MERN Stack",
    description:
      "Build and ship full-stack apps with MongoDB, Express, React, and Node — from your first route to a deployed project.",
    price: 49,
    estimatedPrice: 129,
    tags: "Programming",
    level: "Beginner",
    demoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: { public_id: "", url: "" },
    benefits: [
      { title: "Lifetime access to all lessons" },
      { title: "Certificate of completion" },
      { title: "Downloadable source code" },
    ],
    prerequisites: [{ title: "Basic HTML, CSS, and JavaScript" }],
    courseData: [
      {
        title: "Setting up your development environment",
        description: "Install Node.js, VS Code, and the tools you'll use throughout the course.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        videoSection: "Getting Started",
        videoLength: 12,
        videoPlayer: "youtube",
        links: [],
        suggestion: "",
        questions: [],
      },
      {
        title: "Building your first Express server",
        description: "Create routes, middleware, and connect to MongoDB.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        videoSection: "Backend Basics",
        videoLength: 24,
        videoPlayer: "youtube",
        links: [],
        suggestion: "",
        questions: [],
      },
    ],
  },
  {
    name: "Digital Marketing Fundamentals",
    description:
      "Learn SEO, social media strategy, and paid ads well enough to run a real campaign from scratch.",
    price: 39,
    estimatedPrice: 89,
    tags: "Digital Marketing",
    level: "Beginner",
    demoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: { public_id: "", url: "" },
    benefits: [
      { title: "Real campaign templates" },
      { title: "Access to private community" },
    ],
    prerequisites: [{ title: "None — start from zero" }],
    courseData: [
      {
        title: "How search engines actually rank pages",
        description: "The fundamentals of SEO, explained without the jargon.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        videoSection: "SEO Basics",
        videoLength: 18,
        videoPlayer: "youtube",
        links: [],
        suggestion: "",
        questions: [],
      },
    ],
  },
  {
    name: "UI/UX Design for Developers",
    description:
      "You don't need to be a designer to make things that don't look terrible. Learn the rules that matter.",
    price: 35,
    tags: "Graphic Design",
    level: "Intermediate",
    demoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    thumbnail: { public_id: "", url: "" },
    benefits: [{ title: "Figma starter kit included" }],
    prerequisites: [{ title: "Comfortable writing HTML/CSS" }],
    courseData: [
      {
        title: "Typography and spacing that doesn't look like a template",
        description: "Type pairing, scale, and the 8px grid.",
        videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
        videoSection: "Foundations",
        videoLength: 15,
        videoPlayer: "youtube",
        links: [],
        suggestion: "",
        questions: [],
      },
    ],
  },
];

const seed = async () => {
  await connectDB();

  // 1. Create (or find) the admin user
  let admin = await userModel.findOne({ email: ADMIN_EMAIL });
  if (!admin) {
    admin = await userModel.create({
      name: "Admin",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      isVerified: true,
    });
    console.log(`Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  } else if (admin.role !== "admin") {
    admin.role = "admin";
    await admin.save();
    console.log(`Promoted existing user ${ADMIN_EMAIL} to admin`);
  } else {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  }

  // 2. Create sample courses (skip any that already exist by name)
  for (const course of sampleCourses) {
    const exists = await CourseModel.findOne({ name: course.name });
    if (exists) {
      console.log(`Skipping (already exists): ${course.name}`);
      continue;
    }
    await CourseModel.create(course);
    console.log(`Created course: ${course.name}`);
  }

  console.log("\nSeed complete. Log in with:");
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log("(change this password once you've logged in)");

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});