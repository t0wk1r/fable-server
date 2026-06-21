const verifyWriter = async (req, res, next) => {
  if (req.decoded.role !== "writer") {
    return res.status(403).send({
      success: false,
      message: "Forbidden Access",
    });
  }

  next();
};

module.exports = verifyWriter;