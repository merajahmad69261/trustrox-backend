function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const errorDetails = error.details.map((detail) => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails,
      });
    }
    req[property] = value;
    next();
  };
}

module.exports = validate;
