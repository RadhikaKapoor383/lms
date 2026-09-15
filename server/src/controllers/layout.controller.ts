import { Request, Response, NextFunction } from "express";
import cloudinary from "cloudinary";
import { CatchAsyncError } from "../middleware/catchAsyncErrors";
import ErrorHandler from "../utils/ErrorHandler";
import LayoutModel from "../models/layout.model";

export const createLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      const isTypeExist = await LayoutModel.findOne({ type });
      if (isTypeExist) {
        return next(new ErrorHandler(`${type} already exists`, 400));
      }

      if (type === "Banner") {
        const { image, title, subTitle } = req.body;
        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });
        const banner = {
          type: "Banner",
          banner: {
            image: { public_id: myCloud.public_id, url: myCloud.secure_url },
            title,
            subTitle,
          },
        };
        await LayoutModel.create(banner);
      }

      if (type === "FAQ") {
        const { faq } = req.body;
        await LayoutModel.create({ type: "FAQ", faq });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        await LayoutModel.create({ type: "Categories", categories });
      }

      res.status(200).json({ success: true, message: "Layout created successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const editLayout = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;

      if (type === "Banner") {
        const bannerData = await LayoutModel.findOne({ type: "Banner" });
        const { image, title, subTitle } = req.body;

        if (bannerData && (bannerData as any).banner?.image?.public_id) {
          await cloudinary.v2.uploader.destroy(
            (bannerData as any).banner.image.public_id
          );
        }

        const myCloud = await cloudinary.v2.uploader.upload(image, {
          folder: "layout",
        });

        const banner = {
          image: { public_id: myCloud.public_id, url: myCloud.secure_url },
          title,
          subTitle,
        };

        await LayoutModel.findByIdAndUpdate(bannerData?._id, { banner });
      }

      if (type === "FAQ") {
        const { faq } = req.body;
        const faqItem = await LayoutModel.findOne({ type: "FAQ" });
        await LayoutModel.findByIdAndUpdate(faqItem?._id, { type: "FAQ", faq });
      }

      if (type === "Categories") {
        const { categories } = req.body;
        const categoriesData = await LayoutModel.findOne({ type: "Categories" });
        await LayoutModel.findByIdAndUpdate(categoriesData?._id, {
          type: "Categories",
          categories,
        });
      }

      res.status(200).json({ success: true, message: "Layout updated successfully" });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);

export const getLayoutByType = CatchAsyncError(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { type } = req.body;
      const layout = await LayoutModel.findOne({ type });
      res.status(201).json({ success: true, layout });
    } catch (error: any) {
      return next(new ErrorHandler(error.message, 500));
    }
  }
);
