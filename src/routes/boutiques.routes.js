import { Router } from "express";
import pool from "../database.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

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

router.get('/contact', async (req, res) => {
    try {
        const [result] = await pool.query("Select * from boutiques");
        res.render('boutiques/contact', { boutiques: result });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/questions', async (req, res) => {
    try {
        //const [result] = await pool.query("Select * from boutiques");
        res.render('boutiques/questions');
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/boutique', async (req, res) => {
    try {
        const [boutique] = await pool.query('SELECT * FROM boutiques LIMIT 1');
        res.render('boutiques/boutique', {
            boutique: boutique[0] // Pasar solo el objeto, no el array
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});

router.get('/fotosBoutique', async (req, res) => {
    try {
        //const [result] = await pool.query("Select * from boutiques");
        const [fotos] = await pool.query("SELECT * FROM fotosBoutique where Boutiques_PKBoutique = 1 and Tipo in ('fotosPortada')");
        console.log(fotos)
        res.render('boutiques/fotosBoutique', {
            fotos: fotos // Pasar solo el objeto, no el array
        });
    }
    catch (err) {
        res.status(500).json({ message: err.message })
    }

});



router.post('/boutique/', upload.single('Fotografia'), async (req, res) => { //editar Boutique
    const Fotografia = req.file ? `/img/${req.file.filename}` : null; 
    const { NombreBoutique, Mision, Vision, Telefono, Direccion, Facebook, Instagram, Whatsapp, HorarioLunesViernes, HorarioSabado} = req.body; //
    const editBoutique = {
        NombreBoutique, Mision, Vision, Telefono, Direccion, Facebook, Instagram, Whatsapp,HorarioLunesViernes, HorarioSabado
    };
    if (Fotografia) {
        editBoutique.hrefLogo = Fotografia;
    }


    await pool.query('UPDATE Boutiques SET ? WHERE PkProducto = 1', [editBoutique]); //inser datos
    res.redirect('/boutique?editSuccess=true'); //actualizamos pagina
});

router.post('/fotos/', upload.fields([
    { name: 'Fotografia1', maxCount: 1 },
    { name: 'Fotografia2', maxCount: 1 }
]), async (req, res) => {
    const Fotografia1 = req.files['Fotografia1'] ? `/img/${req.files['Fotografia1'][0].filename}` : null;
    const Fotografia2 = req.files['Fotografia2'] ? `/img/${req.files['Fotografia2'][0].filename}` : null;

    if (Fotografia1) {
        await pool.query('UPDATE FotosBoutique SET href = ? WHERE PKFotos = 1', [Fotografia1]);
    }
    if (Fotografia2) {
        await pool.query('UPDATE FotosBoutique SET href = ? WHERE PKFotos = 2', [Fotografia2]);
    }

    res.redirect('/fotosBoutique?editSuccess=true'); // Actualizamos la página
});




export default router;