const verifyAdmin = async (req, res, next) => {
  if (req.decoded.role !== "admin") {
    return res.status(403).send({
      success: false,
      message: "Forbidden Access",
    });
  }

  next();
};

module.exports = verifyAdmin;