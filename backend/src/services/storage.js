import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import config from "../config/env.js";
import { RESUME_DOWNLOAD_URL_TTL_SECONDS } from "../config/constants.js";

cloudinary.config({
  cloud_name: config.cloudinaryCloudName,
  api_key: config.cloudinaryApiKey,
  api_secret: config.cloudinaryApiSecret,
  secure: true,
});

export const uploadResumeBuffer = async (
  buffer,
  { userId, fileType, fileName } = {}
) => {
  let ext = fileType;
  if (!ext && fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".docx")) ext = "docx";
    else if (lower.endsWith(".pdf")) ext = "pdf";
  }
  if (!ext) {
    if (
      buffer.length >= 4 &&
      buffer.subarray(0, 4).toString("hex") === "504b0304"
    ) {
      ext = "docx";
    } else {
      ext = "pdf";
    }
  }

  const uniqueId = crypto.randomUUID();
  const publicIdWithExt = `${uniqueId}.${ext}`;
  const folder = `applog/resumes/${userId}`;

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        type: "authenticated",
        folder,
        public_id: publicIdWithExt,
        overwrite: false,
      },
      (error, uploadResult) => {
        if (error) return reject(error);
        resolve(uploadResult);
      }
    );
    stream.end(buffer);
  });

  return { publicId: result.public_id };
};

export const getSignedDownloadUrl = (publicId, fileName) => {
  const expiresAt =
    Math.floor(Date.now() / 1000) + RESUME_DOWNLOAD_URL_TTL_SECONDS;
  const options = {
    resource_type: "raw",
    type: "authenticated",
    expires_at: expiresAt,
  };
  if (fileName) {
    options.attachment = fileName;
  }

  return cloudinary.utils.private_download_url(publicId, "", options);
};

export const deleteAsset = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: "raw",
      type: "authenticated",
    });
    return result?.result === "ok";
  } catch (error) {
    console.error(
      `Failed to delete Cloudinary asset with publicId: ${publicId}`,
      error?.message || error
    );
    return false;
  }
};

export default {
  uploadResumeBuffer,
  getSignedDownloadUrl,
  deleteAsset,
};
