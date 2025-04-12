const express = require("express");
const cors = require("cors");
const app = express();
const piRoutes = require("./controllers/piController");

app.use(cors());
app.use(express.json());

app.use("/api/pi", piRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
