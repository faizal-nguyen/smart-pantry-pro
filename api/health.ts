export default function handler(req, res) {
  res.status(200).json({ 
    status: 'alive',
    time: new Date().toISOString()
  });
}