import jwt from "jsonwebtoken";

/**
 * Admin-only guard (used elsewhere)
 */
export const create = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access only" });
  }
  next();
};

/**
 * Verify JWT token (FIXED, backward-compatible)
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ NORMALIZE USER SHAPE (KEY FIX)
    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role,
    };

    if (!req.user.id || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (err) {
    console.error("JWT verify error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Role-based authorization (unchanged)
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    }
    next();
  };
};