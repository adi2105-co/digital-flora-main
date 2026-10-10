const path = require('path');
const fs = require('fs');
const express = require('express');
const app = require('./app');

const dist = path.join(__dirname, '../dist');
if (fs.existsSync(dist)) { // production: also serve the built frontend
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🌿 Digital Flora API on http://localhost:${PORT}`));
