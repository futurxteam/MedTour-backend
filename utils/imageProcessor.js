import sharp from "sharp";
import crypto from "crypto";

/**
 * Processes an image buffer: resizes to 512x512, optimizes quality, and generates a SHA-256 hash.
 * @param {Buffer} buffer - Raw image buffer
 * @returns {Promise<{data: Buffer, hash: String, info: Object}>}
 */
export const processProfilePhoto = async (buffer) => {
    // Process with Sharp
    const processedBuffer = await sharp(buffer)
        .resize(512, 512, {
            fit: "cover",
            position: "center",
        })
        .webp({ quality: 80 }) // Standardize to WebP for better compression
        .toBuffer();

    // Generate SHA-256 Hash
    const hash = crypto
        .createHash("sha256")
        .update(processedBuffer)
        .digest("hex");

    return {
        data: processedBuffer,
        hash,
        contentType: "image/webp",
        size: processedBuffer.length,
    };
};
