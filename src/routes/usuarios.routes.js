import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { console } from "inspector";



// Obtener el directorio correcto para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar almacenamiento con Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = path.join(__dirname, "../public/img"); // Ajusta la ruta según la ubicación de `public`
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

// Inicializa Multer
const upload = multer({ storage });
const router = Router();

router.get('/login', async (req, res) => { //url cargue de Login
    try {
        //const [result] = await pool.query("Select * from productos");
        res.render('usuarios/login', { query: req.query });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.post('/userRegister', async (req, res) => { //registrar usuario
    
    const { Nombre, Telefono, Email, Contrasena, RepetirContrasena } = req.body;
   

    // Validar que las contraseñas coincidan
    if (Contrasena !== RepetirContrasena) {
        return res.redirect('/login?addSuccess=false&message=Las contraseñas no coinciden');
    }

    // Validar que la contraseña tenga al menos 8 caracteres
    if (!Contrasena || Contrasena.length < 8) {
        return res.redirect('/login?addSuccess=false&message=La contraseña debe tener al menos 8 caracteres');
    }

    // Validar si el correo ya está registrado
    const [rows] = await pool.query('SELECT count(*) as conteo FROM usuarios WHERE Email = ?', [Email]);

    if (rows[0].conteo > 0) {
        return res.redirect('/login?addSuccess=false&message=Este correo ya está registrado');
    }

    if (!Nombre.match(/^[a-zA-Z\s]+$/)) {
        return res.redirect('/login?addSuccess=false&message=Nombre inválido');
    }
    if (!Telefono.match(/^\d{7,15}$/)) {
        return res.redirect('/login?addSuccess=false&message=Teléfono inválido');
    }
    
    // Encriptar la contraseña antes de guardarla

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Contrasena, salt);

    // Insertar usuario con la contraseña encriptada
    const newUser = { Nombre, Telefono, Email, Contrasena: hashedPassword };
    await pool.query('INSERT INTO usuarios SET ?', [newUser]);

    res.redirect('/login?addSuccess=true&message=Usuario registrado con éxito');
});

router.post('/login', async (req, res) => {
    const { loginEmail, loginPassword } = req.body;

    // Verificar si el usuario existe
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE Email = ?', [loginEmail]);
    if (rows.length === 0) {
        return res.redirect('/login?addSuccess=false&message=Correo no registrado');
    }

    // Obtener la contraseña cifrada guardada en la base de datos
    const storedPassword = rows[0].Contrasena;


    const salt = await bcrypt.genSalt(10);
    const hashedPasswor = await bcrypt.hash(loginPassword, salt);
    const hashedPasswor1 = await bcrypt.hash(loginPassword, salt);

    console.log(hashedPasswor);
    console.log(hashedPasswor1);
    console.log(storedPassword);

    // Comparar la contraseña ingresada con la almacenada
    const passwordMatch = await bcrypt.compare(loginPassword, storedPassword);
    if (!passwordMatch) {
        console.log("----------------------------------------------");
        return res.redirect('/login?addSuccess=false&message=Contraseña incorrecta');
    }

    // Generar el código de seguridad para el usuario
    const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

    const hashedCode = await bcrypt.hash(securityCode, salt);

    // Guardar el código cifrado en la base de datos
    await pool.query('UPDATE usuarios SET CodSeguridad = ? WHERE Email = ?', [hashedCode, loginEmail]);

    // Enviar el código por correo
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'bell03h@gmail.com',
            pass: '1234567Hl-' // Usa variables de entorno en producción
        }
    });

    const mailOptions = {
        from: 'bell03h@gmail.com',
        to: loginEmail,
        subject: 'Código de seguridad para inicio de sesión',
        text: `Tu código de seguridad es: ${securityCode}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return res.redirect('/login?addSuccess=false&message=Error al enviar el código de seguridad');
        }
        return res.redirect(`/login?addSuccess=true&message=Código enviado, revisa tu correo&email=${loginEmail}`);
    });
});



export default router;