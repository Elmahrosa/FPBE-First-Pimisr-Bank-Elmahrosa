import type { NextApiRequest, NextApiResponse } from "next";

// Proxy to backend API
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const alerts = await fetch("http://localhost:4302/api/alerts").then(r => r.json());
  res.json(alerts);
}
