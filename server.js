const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;
const publicDirectory = path.join(__dirname, "public");

app.use(express.static(publicDirectory));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Market Lab is listening on port ${port}`);
});
