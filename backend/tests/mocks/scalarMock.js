// Mock for @scalar/express-api-reference
// Used during testing to avoid ES module import issues
module.exports = {
  apiReference: () => (req, res, next) => next(),
};
