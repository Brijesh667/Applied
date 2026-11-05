import User from "../models/User.js";

export const isAuthenticated = async (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: "Not authenticated" });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      res.clearCookie("sid");
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
};

export default isAuthenticated;
