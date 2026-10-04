// One-time backfill: issue certificates to students who already qualified
// before certificates existed.
//
//   npm run migrate:certificates
//
// Safe to run more than once: a student who already has a certificate is
// skipped, and one who doesn't qualify yet is left alone.
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "./utils/db";
import { redis } from "./utils/redis";
import EnrollmentModel from "./models/enrollment.model";
import CertificateModel from "./models/certificate.model";
import { evaluateCertificate } from "./services/certificate.service";

const migrate = async () => {
  await connectDB();

  // Only completed enrollments can qualify, so start from those.
  const completed = await EnrollmentModel.find({ status: "completed" });
  console.log(`Found ${completed.length} completed enrollment(s)`);

  let issued = 0;
  let alreadyHad = 0;
  let notYet = 0;
  let failed = 0;

  for (const enrollment of completed) {
    try {
      const had = await CertificateModel.exists({
        student: enrollment.student,
        course: enrollment.course,
      });
      if (had) {
        alreadyHad++;
        continue;
      }

      const certificate = await evaluateCertificate(
        String(enrollment.student),
        String(enrollment.course)
      );
      if (certificate) issued++;
      else notYet++; // e.g. a quiz in that course hasn't been passed
    } catch (error: any) {
      failed++;
      console.error(`Failed for enrollment ${enrollment._id}:`, error.message);
    }
  }

  console.log(
    `Certificates issued: ${issued}, already had one: ${alreadyHad}, not eligible yet: ${notYet}, failed: ${failed}`
  );

  await mongoose.disconnect();
  await redis.quit();
  process.exit(0);
};

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
