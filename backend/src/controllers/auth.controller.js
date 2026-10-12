const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const TokenBlacklist = require("../models/TokenBlacklist");
const { hashToken } = require("../utils/token");

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  maxAge: 24 * 60 * 60 * 1000,
});

function signToken(user) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    const error = new Error("JWT_SECRET must be configured with at least 32 characters.");
    error.status = 503;
    throw error;
  }
  return jwt.sign({ email: user.email, name: user.name }, process.env.JWT_SECRET, {
    subject: String(user._id),
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function publicUser(user) {
  return { id: String(user._id), name: user.name, email: user.email };
}

async function register(req, res, next) {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (name.length < 2) return res.status(400).json({ message: "Name must be at least 2 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
    if (await User.exists({ email })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    const token = signToken(user);
    res.cookie("accessToken", token, cookieOptions());
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { next(error); }
}

async function login(req, res, next) {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email or password is incorrect." });
    }
    const token = signToken(user);
    res.cookie("accessToken", token, cookieOptions());
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
}

async function me(req, res) {
  res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email } });
}

async function logout(req, res, next) {
  try {
    const decoded = jwt.decode(req.accessToken);
    if (decoded?.exp) {
      await TokenBlacklist.updateOne(
        { tokenHash: hashToken(req.accessToken) },
        { $setOnInsert: { tokenHash: hashToken(req.accessToken), expiresAt: new Date(decoded.exp * 1000) } },
        { upsert: true }
      );
    }
    res.clearCookie("accessToken", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });
    res.json({ message: "Signed out successfully." });
  } catch (error) { next(error); }
}

module.exports = { register, login, me, logout };
