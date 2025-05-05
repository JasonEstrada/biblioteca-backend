const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

//Routes
const usuarioRoutes = require('./routes/usuarioRoutes'); 
const libroRoutes = require('./routes/libroRoutes');
const authRoutes = require('./routes/authRoutes');


// Crear la conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Conectar a la base de datos
db.connect(err => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos MySQL');
});

const app = express();
app.use(express.json()); // Para manejar solicitudes JSON

// Rutas
app.get('/', (req, res) => {
  res.send('Bienvenido a la API de la Biblioteca');
});
app.use('/api/usuarios', usuarioRoutes); // Ruta para los Usuarios
app.use('/api/libros', libroRoutes); // Ruta para los Libros
app.use('/api/auth', authRoutes); // Ruta para la Autenticación

// Puerto del servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
