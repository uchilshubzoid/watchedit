const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  app.use(
    "/mal",
    createProxyMiddleware({
      target: "https://api.myanimelist.net",
      changeOrigin: true,
      pathRewrite: { "^/mal": "" },
    })
  );
};
