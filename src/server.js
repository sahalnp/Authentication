import express from 'express';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => {
  res.render('login'); 
});

app.get('/signup', (req, res) => {
    res.render('signup'); 
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
