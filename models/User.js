import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
  type: String,
  required: function () {
    return this.provider !== "google";
  },
},
provider: {
  type: String,
  enum: ["local", "google"],
  default: "local",
},
  role: {
    type: String,
    enum: ["user", "doctor", "assistant", "admin"],
    default: "user",
  },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
