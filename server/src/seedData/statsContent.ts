// The words and numbers behind `npm run seed:stats` (see ../seedStats.ts).
// Names are common Pakistani and international names; emails use the reserved
// ".example" domain, so nothing seeded can ever reach a real inbox.

export const STUDENT_EMAIL_DOMAIN = "learners.ledger.example";
export const INSTRUCTOR_EMAIL_DOMAIN = "faculty.ledger.example";

export const FIRST_NAMES = [
  "Ayesha", "Ali", "Fatima", "Hassan", "Sana", "Usman", "Zainab", "Bilal", "Hira", "Ahmed",
  "Maryam", "Daniyal", "Noor", "Hamza", "Areeba", "Faizan", "Mahnoor", "Taha", "Rabia", "Saad",
  "Iqra", "Owais", "Laiba", "Junaid", "Komal", "Waleed", "Sidra", "Rehan", "Anum", "Shahzaib",
  "Mehwish", "Talha", "Amna", "Zeeshan", "Kinza", "Arslan", "Sumaiya", "Haris", "Dua", "Moiz",
];

export const LAST_NAMES = [
  "Khan", "Raza", "Noor", "Ahmed", "Malik", "Tariq", "Ali", "Hussain", "Shah", "Siddiqui",
  "Iqbal", "Sheikh", "Qureshi", "Javed", "Butt", "Aslam", "Memon", "Chaudhry", "Ansari", "Baig",
  "Farooq", "Mirza", "Rehman", "Abbasi", "Lodhi", "Rizvi", "Zaidi", "Hashmi", "Gill", "Soomro",
];

export interface IInstructorSeed {
  name: string;
  slug: string;
  bio: string;
  expertise: string[];
}

export const INSTRUCTORS: IInstructorSeed[] = [
  { name: "Sana Ahmed", slug: "sana.ahmed", bio: "Software engineer turned teacher. Ten years of building web products and mentoring juniors.", expertise: ["JavaScript", "React", "TypeScript"] },
  { name: "Imran Qureshi", slug: "imran.qureshi", bio: "Backend developer who likes simple, well-tested APIs.", expertise: ["Node.js", "Databases", "APIs"] },
  { name: "Nadia Farooq", slug: "nadia.farooq", bio: "Data analyst and educator. Explains statistics with real examples.", expertise: ["Python", "Statistics", "Machine learning"] },
  { name: "Kamran Mirza", slug: "kamran.mirza", bio: "Growth marketer who has run campaigns for startups and agencies.", expertise: ["SEO", "Social media", "Analytics"] },
  { name: "Hina Baig", slug: "hina.baig", bio: "Product designer. Believes good design is mostly good decisions.", expertise: ["UI design", "Typography", "Figma"] },
  { name: "Faisal Rehman", slug: "faisal.rehman", bio: "Operations manager and certified project manager.", expertise: ["Project management", "Excel", "Operations"] },
];

export const CATEGORIES = ["Web Development", "Data Science", "Digital Marketing", "Graphic Design", "Business Skills"];

export type CourseStatus = "Published" | "Pending Approval" | "Draft" | "Rejected" | "Archived";

export interface ICourseSeed {
  name: string;
  category: string;
  instructor: number; // index into INSTRUCTORS
  level: "Beginner" | "Intermediate" | "Advanced";
  price: number; // 0 = free
  durationHours: number;
  status: CourseStatus;
  popularity: number; // relative share of enrolments
  description: string;
  modules: { title: string; lessons: string[] }[];
}

const m = (title: string, ...lessons: string[]) => ({ title, lessons });

export const COURSES: ICourseSeed[] = [
  {
    name: "React for Beginners", category: "Web Development", instructor: 0, level: "Beginner", price: 0, durationHours: 14, status: "Published", popularity: 10,
    description: "Build real interfaces with components, state and props - from your first component to a small finished app.",
    modules: [
      m("Getting started", "What React is and why it exists", "Setting up your first project", "JSX in plain words"),
      m("Components and state", "Props and composition", "State with useState", "Handling events and forms"),
      m("Building something real", "Fetching data with useEffect", "Lists, keys and conditional UI", "Project: a small task tracker"),
    ],
  },
  {
    name: "TypeScript Essentials", category: "Web Development", instructor: 0, level: "Intermediate", price: 29, durationHours: 10, status: "Published", popularity: 6,
    description: "Types that catch bugs before your users do: the parts of TypeScript you will use every day.",
    modules: [
      m("The basics", "Why types help", "Primitive types and arrays", "Functions and return types"),
      m("Shaping data", "Interfaces and type aliases", "Unions and narrowing", "Generics, step by step"),
      m("In practice", "Typing React components", "Typing API responses", "Project: migrating a small app"),
    ],
  },
  {
    name: "Node.js and Express APIs", category: "Web Development", instructor: 1, level: "Intermediate", price: 39, durationHours: 16, status: "Published", popularity: 7,
    description: "Design and build a REST API with Node, Express and MongoDB - with authentication and tests.",
    modules: [
      m("Foundations", "How the web request cycle works", "Your first Express server", "Routing and middleware"),
      m("Data", "Modelling data in MongoDB", "CRUD with Mongoose", "Validation and error handling"),
      m("Shipping it", "Authentication with JWT", "Writing API tests", "Deploying your API"),
    ],
  },
  {
    name: "Modern CSS and Responsive Design", category: "Web Development", instructor: 4, level: "Beginner", price: 0, durationHours: 8, status: "Published", popularity: 5,
    description: "Flexbox, grid and the habits that make layouts work on every screen.",
    modules: [
      m("Layout", "The box model without the confusion", "Flexbox in an afternoon", "CSS grid for page layouts"),
      m("Responsive", "Mobile-first thinking", "Media queries that make sense", "Fluid type and spacing"),
    ],
  },
  {
    name: "Python for Data Analysis", category: "Data Science", instructor: 2, level: "Beginner", price: 35, durationHours: 18, status: "Published", popularity: 9,
    description: "Clean, explore and visualise real datasets with Python, pandas and matplotlib.",
    modules: [
      m("Python you need", "Variables, lists and dictionaries", "Functions and loops", "Reading files"),
      m("Working with data", "DataFrames with pandas", "Cleaning messy data", "Grouping and aggregating"),
      m("Telling the story", "Charts that explain", "Exploratory analysis walkthrough", "Project: analysing a sales dataset"),
    ],
  },
  {
    name: "Statistics for Decision Making", category: "Data Science", instructor: 2, level: "Intermediate", price: 25, durationHours: 12, status: "Published", popularity: 4,
    description: "Averages, variation, probability and testing - explained with decisions you actually make.",
    modules: [
      m("Describing data", "Mean, median and spread", "Distributions in pictures", "Spotting outliers"),
      m("Reasoning with uncertainty", "Probability basics", "Sampling and confidence", "Hypothesis tests, plainly"),
    ],
  },
  {
    name: "Machine Learning Foundations", category: "Data Science", instructor: 2, level: "Advanced", price: 59, durationHours: 22, status: "Published", popularity: 5,
    description: "How models learn, how to tell if they are any good, and how not to fool yourself.",
    modules: [
      m("The idea", "What learning from data means", "Training, validation and test sets", "Overfitting and underfitting"),
      m("Core models", "Linear and logistic regression", "Decision trees and forests", "Evaluating a model honestly"),
      m("Applying it", "Feature preparation", "A complete workflow", "Project: predicting customer churn"),
    ],
  },
  {
    name: "SEO Fundamentals", category: "Digital Marketing", instructor: 3, level: "Beginner", price: 19, durationHours: 7, status: "Published", popularity: 6,
    description: "How search engines rank pages, and what you can do about it this week.",
    modules: [
      m("How search works", "Crawling, indexing and ranking", "Keywords and intent", "On-page basics"),
      m("Growing visibility", "Content that earns links", "Technical SEO checklist", "Measuring results"),
    ],
  },
  {
    name: "Social Media Strategy", category: "Digital Marketing", instructor: 3, level: "Intermediate", price: 29, durationHours: 9, status: "Published", popularity: 4,
    description: "Plan, publish and measure a social strategy that fits your audience instead of chasing trends.",
    modules: [
      m("Strategy", "Choosing platforms", "Audience and voice", "A content calendar that survives"),
      m("Doing the work", "Writing posts people finish", "Paid vs organic", "Reading the analytics"),
    ],
  },
  {
    name: "Design Principles for Beginners", category: "Graphic Design", instructor: 4, level: "Beginner", price: 0, durationHours: 9, status: "Published", popularity: 6,
    description: "Hierarchy, contrast, spacing and colour: the rules behind designs that look right.",
    modules: [
      m("Seeing like a designer", "Hierarchy and focus", "Contrast and alignment", "Spacing and rhythm"),
      m("Type and colour", "Choosing and pairing fonts", "Colour that works", "Project: a one-page poster"),
    ],
  },
  {
    name: "Project Management Essentials", category: "Business Skills", instructor: 5, level: "Beginner", price: 29, durationHours: 10, status: "Published", popularity: 5,
    description: "Scope, schedule, risks and people: run a project from kickoff to delivery.",
    modules: [
      m("Starting well", "What a project really is", "Scope and requirements", "Estimating honestly"),
      m("Running it", "Scheduling and milestones", "Managing risks and changes", "Status reports that get read"),
    ],
  },
  {
    name: "Excel for Business Analysis", category: "Business Skills", instructor: 5, level: "Intermediate", price: 22, durationHours: 11, status: "Published", popularity: 5,
    description: "Formulas, pivot tables and dashboards that answer real business questions.",
    modules: [
      m("Formulas that matter", "Lookups and conditional logic", "Cleaning data in Excel", "Text and date functions"),
      m("Analysis", "Pivot tables in depth", "Charts and dashboards", "Project: a monthly sales report"),
    ],
  },
  // Not published: they make the "pending approval", "draft" etc. parts of the admin pages meaningful.
  {
    name: "Introduction to Cybersecurity", category: "Web Development", instructor: 1, level: "Beginner", price: 33, durationHours: 12, status: "Pending Approval", popularity: 0,
    description: "Threats, defences and good habits for people who build or run web applications.",
    modules: [m("Basics", "Who attacks and why", "Passwords, hashing and sessions", "The most common web vulnerabilities")],
  },
  {
    name: "Mobile App Design", category: "Graphic Design", instructor: 4, level: "Intermediate", price: 31, durationHours: 9, status: "Pending Approval", popularity: 0,
    description: "Designing screens and flows that feel natural on a phone.",
    modules: [m("Foundations", "Designing for thumbs", "Navigation patterns", "Prototyping a flow")],
  },
  {
    name: "Advanced SQL for Analysts", category: "Data Science", instructor: 2, level: "Advanced", price: 0, durationHours: 8, status: "Draft", popularity: 0,
    description: "Window functions, CTEs and query tuning.",
    modules: [m("Beyond SELECT", "Window functions", "Common table expressions")],
  },
  {
    name: "Public Speaking Basics", category: "Business Skills", instructor: 5, level: "Beginner", price: 15, durationHours: 5, status: "Archived", popularity: 1,
    description: "Structure a talk, steady your nerves and hold a room.",
    modules: [m("The talk", "Structuring a message", "Calming your nerves")],
  },
  {
    name: "Logo Design Workshop", category: "Graphic Design", instructor: 4, level: "Beginner", price: 18, durationHours: 6, status: "Rejected", popularity: 0,
    description: "Sketch, refine and present a logo.",
    modules: [m("Workshop", "Research and sketching", "Refining a mark")],
  },
];

export interface IQuestionSeed {
  text: string;
  type: "single" | "multiple" | "trueFalse" | "shortAnswer";
  options?: { text: string; correct: boolean }[];
  accepted?: string[];
  marks: number;
}

const opt = (text: string, correct = false) => ({ text, correct });

// 8 questions per category; every quiz picks from its category's bank.
export const QUESTION_BANKS: Record<string, IQuestionSeed[]> = {
  "Web Development": [
    { text: "Which HTTP method is normally used to create a new resource?", type: "single", marks: 1, options: [opt("GET"), opt("POST", true), opt("DELETE"), opt("HEAD")] },
    { text: "Which of these are valid ways to store state in a React component?", type: "multiple", marks: 2, options: [opt("useState", true), opt("useReducer", true), opt("document.title"), opt("A class field with setState", true)] },
    { text: "Using const means the variable's contents can never change.", type: "trueFalse", marks: 1, options: [opt("True"), opt("False", true)] },
    { text: "What does CSS stand for? (short answer)", type: "shortAnswer", marks: 1, accepted: ["cascading style sheets", "cascading style sheet"] },
    { text: "Which status code means the resource was not found?", type: "single", marks: 1, options: [opt("200"), opt("301"), opt("404", true), opt("500")] },
    { text: "Which are JavaScript primitive types?", type: "multiple", marks: 2, options: [opt("string", true), opt("number", true), opt("object"), opt("boolean", true)] },
    { text: "A promise can be pending, fulfilled or rejected.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "Name the command that installs a package with npm. (short answer)", type: "shortAnswer", marks: 1, accepted: ["npm install", "npm i"] },
  ],
  "Data Science": [
    { text: "Which measure is least affected by extreme outliers?", type: "single", marks: 1, options: [opt("Mean"), opt("Median", true), opt("Range"), opt("Sum")] },
    { text: "Which of these help avoid overfitting?", type: "multiple", marks: 2, options: [opt("A separate test set", true), opt("More relevant training data", true), opt("Training for far longer on the same data"), opt("Regularisation", true)] },
    { text: "Correlation always proves one variable causes the other.", type: "trueFalse", marks: 1, options: [opt("True"), opt("False", true)] },
    { text: "Which Python library is mainly used for DataFrames? (short answer)", type: "shortAnswer", marks: 1, accepted: ["pandas"] },
    { text: "A model that is too simple to capture the pattern is...", type: "single", marks: 1, options: [opt("Overfitting"), opt("Underfitting", true), opt("Calibrated"), opt("Normalised")] },
    { text: "Which are measures of spread?", type: "multiple", marks: 2, options: [opt("Standard deviation", true), opt("Variance", true), opt("Median"), opt("Interquartile range", true)] },
    { text: "A larger sample usually gives a more reliable estimate.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "What do we call the data a model is finally judged on? (short answer)", type: "shortAnswer", marks: 1, accepted: ["test set", "the test set", "test data"] },
  ],
  "Digital Marketing": [
    { text: "What does SEO stand for?", type: "single", marks: 1, options: [opt("Search Engine Optimisation", true), opt("Social Engagement Output"), opt("Site Effort Overview"), opt("Secure Email Operation")] },
    { text: "Which of these are on-page SEO factors?", type: "multiple", marks: 2, options: [opt("Page title", true), opt("Heading structure", true), opt("Domain registrar"), opt("Meaningful content", true)] },
    { text: "Paid ads always outperform organic content.", type: "trueFalse", marks: 1, options: [opt("True"), opt("False", true)] },
    { text: "What does CTR stand for? (short answer)", type: "shortAnswer", marks: 1, accepted: ["click through rate", "click-through rate"] },
    { text: "Which metric shows the share of visitors who leave after one page?", type: "single", marks: 1, options: [opt("Bounce rate", true), opt("Impressions"), opt("Reach"), opt("Frequency")] },
    { text: "Which are good practices for a content calendar?", type: "multiple", marks: 2, options: [opt("Plan around audience questions", true), opt("Post only when inspired"), opt("Review analytics regularly", true), opt("Mix formats", true)] },
    { text: "Backlinks from trusted sites can help a page rank.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "What is the practice of testing two versions of a page called? (short answer)", type: "shortAnswer", marks: 1, accepted: ["ab testing", "a/b testing", "a b testing", "split testing"] },
  ],
  "Graphic Design": [
    { text: "Which principle guides the viewer to the most important element first?", type: "single", marks: 1, options: [opt("Hierarchy", true), opt("Symmetry"), opt("Texture"), opt("Repetition")] },
    { text: "Which help text stay readable?", type: "multiple", marks: 2, options: [opt("Enough contrast with the background", true), opt("A comfortable line length", true), opt("Many different fonts on one page"), opt("Adequate line spacing", true)] },
    { text: "More fonts on a page usually make a design look more professional.", type: "trueFalse", marks: 1, options: [opt("True"), opt("False", true)] },
    { text: "What do we call the empty space around elements? (short answer)", type: "shortAnswer", marks: 1, accepted: ["white space", "whitespace", "negative space"] },
    { text: "RGB is mainly used for...", type: "single", marks: 1, options: [opt("Print"), opt("Screens", true), opt("Embroidery"), opt("Engraving")] },
    { text: "Which are complementary colour pairs?", type: "multiple", marks: 2, options: [opt("Blue and orange", true), opt("Red and green", true), opt("Blue and green"), opt("Yellow and purple", true)] },
    { text: "Alignment helps a layout feel organised.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "Which file format keeps transparency and suits web graphics? (short answer)", type: "shortAnswer", marks: 1, accepted: ["png", ".png"] },
  ],
  "Business Skills": [
    { text: "In project management, what does 'scope' describe?", type: "single", marks: 1, options: [opt("The work to be delivered", true), opt("The office location"), opt("Team salaries"), opt("The project name")] },
    { text: "Which belong in a status report?", type: "multiple", marks: 2, options: [opt("Progress against plan", true), opt("Risks and issues", true), opt("Unrelated gossip"), opt("Next steps", true)] },
    { text: "A pivot table can summarise large tables without changing the source data.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "Which Excel function looks a value up in the first column of a table? (short answer)", type: "shortAnswer", marks: 1, accepted: ["vlookup", "xlookup"] },
    { text: "What is a milestone?", type: "single", marks: 1, options: [opt("A significant checkpoint", true), opt("A daily task"), opt("A budget line"), opt("A meeting")] },
    { text: "Which help manage risk?", type: "multiple", marks: 2, options: [opt("Identify it early", true), opt("Assign an owner", true), opt("Ignore low-probability risks"), opt("Plan a response", true)] },
    { text: "Estimates should be revisited as you learn more.", type: "trueFalse", marks: 1, options: [opt("True", true), opt("False")] },
    { text: "What does KPI stand for? (short answer)", type: "shortAnswer", marks: 1, accepted: ["key performance indicator", "key performance indicators"] },
  ],
};

export const ASSIGNMENT_TITLES = [
  "Reflection: what you learned this week",
  "Practical exercise",
  "Mini project",
  "Case study analysis",
  "Hands-on lab",
];

export const SUBMISSION_TEXTS = [
  "I completed the exercise and documented each step. The part I found hardest was applying the idea to my own example.",
  "Please find my work attached via the link. I tried two approaches and compared them at the end.",
  "Summary of my approach, the problems I ran into and how I solved them is below.",
  "My solution follows the brief. I added notes on what I would improve with more time.",
];

export const FEEDBACK_TEXTS = [
  "Well structured and clearly explained. Next time, say a little more about why you chose this approach.",
  "Good effort. The core idea is right; check the edge cases you skipped.",
  "Excellent work - thorough and easy to follow.",
  "Solid submission. A few details are missing; see my comments in the brief.",
  "You are on the right track. Revisit the lesson on the main concept and try the practice questions again.",
];

export const REVIEW_COMMENTS: Record<number, string[]> = {
  5: ["Clear, practical and well paced. Exactly what I needed.", "Best course I have taken on this topic. The projects made it stick.", "Great instructor, great examples."],
  4: ["Very good overall. A couple of lessons could go deeper.", "Useful and well organised. Would recommend.", "Learned a lot, the pace was just right."],
  3: ["Decent introduction, though some parts felt rushed.", "Good content but I wanted more exercises."],
  2: ["The topic is covered but I found it hard to follow in places."],
};

export const DISCUSSION_TITLES = [
  "I'm stuck on the exercise in lesson {n}",
  "Is there a recommended order for the lessons?",
  "How do you usually approach the project?",
  "Can someone explain the idea behind lesson {n}?",
  "Tips for staying consistent?",
  "Where can I find extra practice?",
];

export const DISCUSSION_BODIES = [
  "I followed the steps but my result looks different from the example. Has anyone seen this before?",
  "I'd love to hear how others approached this so I can compare with my own attempt.",
  "I understand the first half but get lost when it gets to the second part. Any pointers?",
];

export const REPLY_BODIES_STUDENT = [
  "I had the same problem - re-reading the previous lesson helped me.",
  "What worked for me was trying a smaller example first.",
  "Thanks for asking, I was wondering the same thing.",
];

export const REPLY_BODIES_INSTRUCTOR = [
  "Good question. Start from the example in the lesson and change one thing at a time - that makes it easy to see what causes the difference.",
  "You are very close. Check the step just before the one that fails; the usual cause is a small typo or a missed step there.",
  "Great point - I'll add a note about this to the lesson. In the meantime, the practice exercise at the end covers it.",
];

export const ANNOUNCEMENTS_COURSE = [
  { title: "Welcome to the course", message: "Welcome! Start with the first lesson and post any questions in the discussion area." },
  { title: "New practice exercise added", message: "I added an extra practice exercise to help with the trickier lessons. It is optional but recommended." },
  { title: "Office hours this week", message: "I'll be answering questions in the discussion area on Thursday evening." },
];

export const ANNOUNCEMENTS_PLATFORM = [
  { title: "Scheduled maintenance", message: "The platform will be briefly unavailable on Sunday night for maintenance. Your progress is safe." },
  { title: "New: certificates", message: "Complete a course and pass its quizzes to earn a verifiable certificate you can download." },
];
