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

  let query = 'SELECT id, titulo, autor, genero, editorial, fecha_publicacion, disponibilidad FROM libros WHERE 1=1'; // 1=1 es una condición siempre verdadera, que facilita la concatenación de filtros

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

// Función para actualizar un libro
const actualizarLibro = (req, res) => {
  const { id } = req.params;  // ID del libro a actualizar
  const { titulo, autor, genero, fecha_publicacion, editorial, disponibilidad } = req.body;

  // Verificar si el libro existe
  db.query('SELECT activo FROM libros WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    const libro = result[0];

    // Verificar si el libro está inactivo
    if (libro.activo === 0) {
      return res.status(400).json({ message: "Libro inhabilitado" });
    }

    // Preparar la consulta para actualizar los campos proporcionados
    let query = 'UPDATE libros SET';
    const params = [];

    // Solo agregamos a la consulta los campos que fueron proporcionados
    if (titulo) {
      query += ' titulo = ?,';
      params.push(titulo);
    }

    if (autor) {
      query += ' autor = ?,';
      params.push(autor);
    }

    if (genero) {
      query += ' genero = ?,';
      params.push(genero);
    }

    if (fecha_publicacion) {
      query += ' fecha_publicacion = ?,';
      params.push(fecha_publicacion);
    }

    if (editorial) {
      query += ' editorial = ?,';
      params.push(editorial);
    }

    if (disponibilidad !== undefined) {
      query += ' disponibilidad = ?,';
      params.push(disponibilidad ? 1 : 0); // Convertir disponibilidad a booleano (1 o 0)
    }

    // Eliminar la última coma extra en la consulta
    query = query.slice(0, -1);

    // Agregar la condición para actualizar el libro con el ID especificado
    query += ' WHERE id = ?';
    params.push(id);

    // Ejecutar la consulta
    db.query(query, params, (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al actualizar el libro' });
      }

      res.status(200).json({ message: 'Libro actualizado con éxito' });
    });
  });
};

// Función para inhabilitar un libro
const inhabilitarLibro = (req, res) => {
  const { id } = req.params;  // ID del libro a inhabilitar

  // Verificar si el libro existe
  db.query('SELECT * FROM libros WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Verificar si el libro ya está inhabilitado (activo = 0)
    if (result[0].activo === 0) {
      return res.status(400).json({ message: 'El libro ya está inhabilitado' });
    }

    // Realizar el "soft delete" (inhabilitar el libro)
    db.query('UPDATE libros SET activo = 0, fecha_inactivacion = CURRENT_TIMESTAMP WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al inhabilitar el libro' });
      }

      res.status(200).json({ message: 'Libro inhabilitado con éxito' });
    });
  });
};

const habilitarLibro = (req, res) => {
  const { id } = req.params;  // ID del libro a habilitar

  // Verificar si el libro existe
  db.query('SELECT * FROM libros WHERE id = ?', [id], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Error en la consulta a la base de datos' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Libro no encontrado' });
    }

    // Verificar si el libro ya está habilitado (activo = 1)
    if (result[0].activo === 1) {
      return res.status(400).json({ message: 'El libro ya está habilitado' });
    }

    // Realizar la habilitación (poner activo = 1)
    db.query('UPDATE libros SET activo = 1, fecha_inactivacion = null WHERE id = ?', [id], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Error al habilitar el libro' });
      }

      res.status(200).json({ message: 'Libro habilitado con éxito' });
    });
  });
};


module.exports = { crearLibro, buscarLibro, actualizarLibro, inhabilitarLibro, habilitarLibro  };
