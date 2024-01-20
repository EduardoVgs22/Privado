import { Router, response } from "express";
import { methods as Users } from "../controllers/language.controllers";
import authenticate from '../middleware/authenticate';
import upload from '../multerConfig';

const router=Router();

router.get("/", Users.getUsers);
router.get("/:id", Users.getUser);
router.post("/", Users.addUsers);
router.put("/:id", Users.updateUser);
router.delete("/:id", Users.deleteUser);
router.post("/login", Users.loginUser);
router.post("/messages", Users.sendMessage);
router.get("/messages/between/:user1Id/:user2Id", Users.getMessagesBetweenUsers); // Esto es para obtener mensajes entre dos usuarios
router.post("/uploadimage", upload.single('image'), Users.uploadImage);
// Añadir ruta para obtener el perfil del usuario autenticado
router.get("/profile/:id", authenticate, Users.getProfile);



export default router;