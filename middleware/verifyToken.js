const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).send({
      success: false,
      message: "Unauthorized Access",
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.decoded = decoded;

    next();
  } catch (error) {
    return res.status(401).send({
      success: false,
      message: "Invalid Token",
    });
  }
};

module.exports = verifyToken;