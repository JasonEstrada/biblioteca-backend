const mysql = require('mysql2');
require('dotenv').config();

// Crear la conexión a la base de datos
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

const crearLibro = (req, res) => {
  const { titulo, autor, genero, editorial, fecha_publicacion } = req.body;

  // Validar que todos los campos estén presentes
  if (!titulo || !autor || !genero || !editorial || !fecha_publicacion) {
    return res.status(400).json({ message: 'Todos los campos son obligatorios' });
  }

  // Insertar el nuevo libro en la base de datos
  const query = 'INSERT INTO libros (titulo, autor, genero, editorial, fecha_publicacion) VALUES (?, ?, ?, ?, ?)';
  db.query(query, [titulo, autor, genero, editorial, fecha_publicacion], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error al crear el libro' });
    }

    res.status(201).json({ message: 'Libro creado con éxito', id: result.insertId });
  });
};

// Función para buscar libros (por ID o con filtros)
const buscarLibro = (req, res) => {
  const { id, genero, fecha_publicacion, editorial, autor, nombre, disponibilidad } = req.query;

  let query = 'SELECT * FROM libros WHERE 1=1'; // 1=1 es una condición siempre verdadera, que facilita la concatenación de filtros

  const params = [];

  // Agregar filtros a la consulta si están presentes en los parámetros
  if (id) {
    query += ' AND id = ?';
    params.push(id);
  }
  if (genero) {
    query += ' AND genero LIKE ?';
    params.push(`%${genero}%`); // `%` es para hacer búsqueda por coincidencias parciales
  }
  if (fecha_publicacion) {
    query += ' AND fecha_publicacion = ?';
    params.push(fecha_publicacion);
  }
  if (editorial) {
    query += ' AND editorial LIKE ?';
    params.push(`%${editorial}%`);
  }
  if (autor) {
    query += ' AND autor LIKE ?';
    params.push(`%${autor}%`);
  }
  if (nombre) {
    query += ' AND titulo LIKE ?';
    params.push(`%${nombre}%`);
  }
  if (disponibilidad !== undefined) {
    query += ' AND disponibilidad = ?';
    params.push(disponibilidad === 'true' ? 1 : 0);
  }

  query += ' AND activo = 1'; // Solo libros activos

  // Ejecutar la consulta
  db.query(query, params, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'No se encontraron libros con esos parámetros de búsqueda' });
    }

    // Responder con los resultados de la búsqueda
    res.status(200).json(result);
  });
};


module.exports = { crearLibro, buscarLibro };
