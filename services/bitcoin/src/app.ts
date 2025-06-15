import express from "express";
import bitcoinRoutes from "./routes/balance";

const app = express();
app.use(express.json());
app.use("/api/bitcoin", bitcoinRoutes);

const PORT = process.env.PORT || 4010;
app.listen(PORT, () => {
  console.log(`Bitcoin microservice running on port ${PORT}`);
});
