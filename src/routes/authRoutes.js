const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const router = express.Router();
const mysql = require('mysql2');
require('dotenv').config();

// Crear la conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Ruta para iniciar sesión y generar el token JWT
router.post('/login', (req, res) => {
  const { email, contraseña } = req.body;

  // Verificar si el correo y la contraseña fueron proporcionados
  if (!email || !contraseña) {
    return res.status(400).json({ message: 'Correo y contraseña son requeridos.' });
  }

  // Buscar al usuario en la base de datos
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const usuario = result[0];

    // Verificar si el usuario está inactivo (campo 'activo' igual a 0)
    if (usuario.activo === 0) {
      return res.status(400).json({ message: 'El usuario se encuentra inactivo, comuníquese con el administrador' });
    }

    // Comparar la contraseña proporcionada con la almacenada (usando bcrypt)
    const isMatch = await bcrypt.compare(contraseña + process.env.PEPPER, usuario.contraseña);

    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    // Crear el token JWT
    const payload = {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      permiso: usuario.permiso
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Responder con el token JWT
    res.status(200).json({ message: 'Inicio de sesión exitoso', token });
  });
});

module.exports = router;
