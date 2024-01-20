import { getConnection } from "../database/database";
import { promisify } from "util";
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // Para generar nombres de archivos únicos

const saltRounds = 10;

// Ejemplo con la función getUsers
const getUsers = async (req, res) => {
  try {
    const connection = await getConnection();
    connection.query("SELECT id, username FROM `users`", (error, results) => {
      connection.release();
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
      }
      res.json(results);
    });
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateUser = async (req, res) => {
  const { id } = req.params;
  const { username, password } = req.body;

  if (!id || !username || !password) {
    return res
      .status(400)
      .json({ message: "Bad request. Please fill all fields." });
  }

  const usuario = { username, password };

  try {
    const connection = await getConnection();
    connection.query(
      "UPDATE `users` SET ? where id = ?",
      [usuario, id],
      (error, results) => {
        connection.release();
        if (error) {
          console.error(error);
          return res.status(500).send(error.message);
        }
        res.json(results);
      }
    );
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const getUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ message: "Bad request. Please provide a valid user ID." });
  }

  try {
    const connection = await getConnection();
    connection.query(
      "SELECT id, username FROM `users` WHERE id = ?",
      id,
      (error, results) => {
        connection.release();
        if (error) {
          console.error(error);
          return res.status(500).send(error.message);
        }
        res.json(results);
      }
    );
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ message: "Bad request. Please provide a valid user ID." });
  }

  try {
    const connection = await getConnection();
    connection.query(
      "DELETE FROM `users` WHERE id = ?",
      id,
      (error, results) => {
        connection.release();
        if (error) {
          console.error(error);
          return res.status(500).send(error.message);
        }
        res.json(results);
      }
    );
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const addUsers = async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).json({ message: "Please fill all fields." });
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);
  const usuario = { username, password: hashedPassword, email };

  try {
    const connection = await getConnection();
    connection.query("INSERT INTO users SET ?", usuario, (error, results) => {
      connection.release();
      if (error) {
        console.error(error);
        return res.status(500).send(error.message);
      }
      res.json(results);
    });
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const secretKey = process.env.SECRET_KEY || "default-secret-key";

    console.log("Attempting to log in with email:", email);

    const connection = await getConnection();
    connection.query(
      "SELECT * FROM `users` WHERE email = ?",
      [email],
      async (error, users) => {
        connection.release();
        if (error) {
          console.error(error);
          res.status(500).json({ message: "Internal Server Error" });
        }

        if (users.length > 0) {
          const user = users[0];
          const match = await bcrypt.compare(password, user.password);

          if (match) {
            const token = jwt.sign({ id: user.id }, secretKey, {
              expiresIn: "1h",
            });
            res.json({
              message: "Login successful",
              token: token,
              userData: user,
            });
          } else {
            console.log("Password mismatch");
            res.status(400).json({ message: "Invalid password" });
          }
        } else {
          console.log("User not found in database");
          res.status(400).json({ message: "User not found" });
        }
      }
    );
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};

const getProfile = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res
      .status(400)
      .json({ message: "Bad request. Please provide a valid user ID." });
  }

  try {
    const connection = await getConnection();
    connection.query(
      "SELECT id, username FROM `users` WHERE id = ?",
      id,
      (error, results) => {
        connection.release();
        if (error) {
          console.error(error);
          return res.status(500).send(error.message);
        }

        if (results && results.length > 0) {
          res.json(results[0]);
        } else {
          res.status(404).json({ message: "User not found" });
        }
      }
    );
  } catch (error) {
    console.error("Error al obtener conexión:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { userId, message, recipient_id, imageUrl } = req.body;

    if (!userId || !recipient_id) {
      return res.status(400).json({
        message: "Bad request. Please provide sender and recipient IDs.",
      });
    }

    const connection = await getConnection();

    if (imageUrl) {
      // Si hay una URL de imagen, inserta el mensaje con la URL
      await connection.query(
        "INSERT INTO mensajes (user_id, message, recipient_id, image) VALUES (?, ?, ?, ?)",
        [userId, message, recipient_id, imageUrl]
      );
    } else {
      // Si no hay una URL de imagen, inserta el mensaje sin la URL
      await connection.query(
        "INSERT INTO mensajes (user_id, message, recipient_id) VALUES (?, ?, ?)",
        [userId, message, recipient_id]
      );
    }

    res.json({ message: "Message sent successfully." });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
};

const getMessagesBetweenUsers = async (req, res) => {
  try {
    const { user1Id, user2Id } = req.params;
    const connection = await getConnection();

    // Promisificar connection.query
    const query = promisify(connection.query).bind(connection);

    // Ahora puedes usar await con query
    const queryResult = await query(
      "SELECT m.user_id, u.username, m.message, m.timestamp FROM mensajes m JOIN users u ON m.user_id = u.id WHERE (m.user_id = ? AND m.recipient_id = ?) OR (m.user_id = ? AND m.recipient_id = ?) ORDER BY m.timestamp ASC",
      [user1Id, user2Id, user2Id, user1Id]
    );

    res.json(queryResult);
  } catch (error) {
    console.error(error);
    res.status(500).send("Ocurrió un error al recuperar los mensajes");
  }
};

const uploadImage = async (req, res) => {
  try {
    console.log(req.file); // Imprime la información sobre el archivo
    // Actualizar la base de datos con la ruta del archivo
    const { userId, text, recipientId } = req.body;
    const { file } = req;
    const connection = await getConnection();

    if (!file || !file.filename) {
      // No hay archivo, pero puede haber texto
      if (!text) {
        return res.status(400).json({ message: "No text or image provided" });
      }

      // Mensaje solo de texto
      const queryText =
        "INSERT INTO mensajes (user_id, message, recipient_id) VALUES (?, ?, ?)";
      const queryValues = [userId || null, text || null, recipientId || null];

      // Promisificar connection.query
      const query = promisify(connection.query).bind(connection);

      const queryResult = await query(queryText, queryValues);

      console.log("Query result:", queryResult);

      // Verificar si la inserción fue exitosa
      if (!queryResult || queryResult.affectedRows === 0) {
        console.error("Failed to insert into the database.");
        return res
          .status(400)
          .json({ message: "Failed to insert into the database." });
      }

      res.json({ message: "Message uploaded successfully", queryResult });
    } else {
      // Mensaje con imagen
      const queryText =
        "INSERT INTO mensajes (user_id, message, recipient_id, image) VALUES (?, ?, ?, ?)";
      const queryValues = [userId || null, text || null, recipientId || null, file.filename];

      // Promisificar connection.query
      const query = promisify(connection.query).bind(connection);

      const queryResult = await query(queryText, queryValues);

      console.log("Query result:", queryResult);

      // Verificar si la inserción fue exitosa
      if (!queryResult || queryResult.affectedRows === 0) {
        console.error("Failed to insert into the database.");
        return res
          .status(400)
          .json({ message: "Failed to insert into the database." });
      }

      res.json({ message: "Message uploaded successfully", queryResult });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};



export const methods = {
  getUsers,
  addUsers,
  getUser,
  deleteUser,
  updateUser,
  loginUser,
  getProfile,
  sendMessage,
  getMessagesBetweenUsers,
  uploadImage, // Agrega esta función al objeto methods
};
