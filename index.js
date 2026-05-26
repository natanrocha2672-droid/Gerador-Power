// Entrypoint mínimo para satisfazer projetos Vercel configurados como Node.
// As rotas reais são servidas por api/index.py via vercel.json rewrites.
export default function handler(_req, res) {
  res.status(200).send('Pexels MCP na Vercel');
}
