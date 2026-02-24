// controllers/authController.js

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library"; // ✅ ADDED
import HospitalProfile from "../models/HospitalProfile.js";
import PatientProfile from "../models/PatientProfile.js";

// ✅ Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * SIGNUP
 * POST /api/auth/signup
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // 1. Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // 2. Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // 3. Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 4. Create user (PATIENT by default)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
      active: true,
    });

    // 4.1 Create patient profile
    await PatientProfile.create({
      userId: user._id,
      profileCompleted: false,
    });

    // 5. Generate JWT (identity only)
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Send response
    return res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({
      message: "Signup failed",
    });
  }
};

/**
 * LOGIN
 * POST /api/auth/login
 * Supports both email and phone number login
 */
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // 1. Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email/Phone and password are required",
      });
    }

    // 2. Determine if login is with email or phone
    const isPhone = /^\d+$/.test(email); // Check if input is all digits

    // Find user by email or phone
    const user = await User.findOne(
      isPhone ? { phone: email } : { email: email }
    );

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 3. Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 4. Role validation (ONLY if role is sent)
    if (role && user.role !== role) {
      return res.status(403).json({
        message: `Access denied for role: ${role}`,
      });
    }

    // 5. Active check
    if (!user.active) {
      return res.status(403).json({
        message: "Account is disabled. Contact administrator.",
      });
    }

    // 6. Hospital approval check (NEW ARCHITECTURE)
    if (user.role === "hospital") {
      const hospitalProfile = await HospitalProfile.findOne({
        userId: user._id,
      });

      if (!hospitalProfile) {
        return res.status(403).json({
          message: "Hospital profile missing",
        });
      }

      if (hospitalProfile.hospitalStatus !== "approved") {
        return res.status(403).json({
          message: "Hospital account awaiting approval",
        });
      }
    }

    // 7. Generate JWT (identity only — NO profile flags)
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 8. Send response
    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      message: "Login failed",
    });
  }
};

/**
 * GOOGLE AUTH
 * POST /api/auth/google
 */
export const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        message: "Google token is required",
      });
    }

    // 1. Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture } = ticket.getPayload();

    // 2. Find existing user
    let user = await User.findOne({ email });

    // 3. Create user if not exists (PATIENT)
    if (!user) {
      user = await User.create({
        name,
        email,
        password: null,
        role: "user",
        active: true,
        provider: "google",
      });

      await PatientProfile.create({
        userId: user._id,
        profileCompleted: false,
      });
    }

    // 4. Generate JWT (identity only)
    const jwtToken = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Send response
    return res.status(200).json({
      message: "Google authentication successful",
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(401).json({
      message: "Google authentication failed",
    });
  }
};

/**
 * CREATE PRIMARY ADMIN
 */
export const createPrimaryAdmin = async (req, res) => {
  try {
    // 🔒 Check if admin already exists
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      return res.status(403).json({
        message: "Primary admin already exists",
      });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
      active: true,
    });

    res.status(201).json({
      message: "Primary admin created successfully",
      admin: {
        id: admin._id,
        email: admin.email,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to create primary admin" });
  }
};

/**
 * REGISTER HOSPITAL
 * POST /api/auth/register-hospital
 */
export const registerHospital = async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    return res.status(409).json({ message: "Hospital already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const hospital = await User.create({
    name,
    email,
    password: hashedPassword,
    role: "hospital",
    active: false,     // 🔒 cannot login yet
    provider: "local",
  });

  // ✅ Create hospital profile (approval handled here)
  await HospitalProfile.create({
    userId: hospital._id,
    hospitalStatus: "pending",
  });

  res.status(201).json({
    message: "Hospital registration submitted",
  });
};
