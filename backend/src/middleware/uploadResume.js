import multer from "multer";
import { RESUME_MAX_BYTES, RESUME_ALLOWED_TYPES } from "../config/constants.js";

const storage = multer.memoryStorage();
const allowedMimeTypes = Object.values(RESUME_ALLOWED_TYPES);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    const error = new Error("Only PDF or DOCX files are allowed");
    error.status = 400;
    error.name = "InvalidFileTypeError";
    return cb(error, false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: RESUME_MAX_BYTES,
    files: 1,
  },
  fileFilter,
}).single("file");

export const uploadResume = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Resume file is required",
        errors: { file: "File is required" },
      });
    }

    const buffer = req.file.buffer;
    if (!buffer || buffer.length === 0) {
      return res.status(400).json({
        message: "Resume file is required",
        errors: { file: "File cannot be empty" },
      });
    }

    const isPdfMagic =
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString("utf-8") === "%PDF-";

    const isDocxMagic =
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04;

    const declaredType =
      req.file.mimetype === RESUME_ALLOWED_TYPES.docx
        ? "docx"
        : req.file.mimetype === RESUME_ALLOWED_TYPES.pdf
        ? "pdf"
        : null;

    if (isPdfMagic && declaredType === "pdf") {
      req.validatedFileType = "pdf";
      return next();
    }

    if (isDocxMagic && declaredType === "docx") {
      req.validatedFileType = "docx";
      return next();
    }

    return res.status(400).json({
      message: "Only PDF or DOCX files are allowed",
    });
  });
};

export default uploadResume;
